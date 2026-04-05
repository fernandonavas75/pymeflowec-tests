'use strict';

const {
  createMockClient, createMockProduct,
  createMockOrder, createMockOrderDetail, mockSequelize,
} = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockSeq = {
  ...mockSequelize,
  transaction: jest.fn(),
};
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSeq,
  connectDB: jest.fn(),
}));

const mockModels = {
  Order:            { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  OrderDetail:      { findAll: jest.fn(), create: jest.fn() },
  Product:          { findOne: jest.fn(), findByPk: jest.fn() },
  Client:           { findOne: jest.fn() },
  User:             { findOne: jest.fn() },
  InventoryMovement:{ create: jest.fn().mockResolvedValue({}) },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const orderService = require('../../pymeflowec-backend/src/services/order.service');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockSeq.transaction.mockImplementation(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
});

// ── create ────────────────────────────────────────────────────────────────────
describe('orderService.create', () => {
  const validData = {
    client_id:  1,
    order_date: '2026-01-01',
    items: [{ product_id: 1, quantity: 2 }],
  };

  it('crea la orden y el subtotal es correcto (IVA es 0 en cabecera, se aplica por ítem)', async () => {
    const product = createMockProduct({ unit_price: '50.00', stock: 10, cost_price: '30.00' });
    const order   = createMockOrder({ id: 99, subtotal: 100, tax: 0, total: 100 });

    mockModels.Client.findOne.mockResolvedValue(createMockClient());
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.Order.create.mockResolvedValue(order);
    mockModels.OrderDetail.create.mockResolvedValue({});
    mockModels.Order.findOne.mockResolvedValue({ ...order, details: [], client: {}, user: {} });

    await orderService.create(validData, 1, 1);

    const orderCreateCall = mockModels.Order.create.mock.calls[0][0];
    expect(orderCreateCall.subtotal).toBe(100); // 50 * 2
    expect(orderCreateCall.tax).toBe(0);        // IVA en cabecera = 0 en v7
    expect(orderCreateCall.total).toBe(100);
  });

  it('crea movimiento de inventario (salida) al crear la orden', async () => {
    const product = createMockProduct({ unit_price: '10.00', stock: 10, cost_price: '5.00' });
    const order   = createMockOrder({ id: 1 });

    mockModels.Client.findOne.mockResolvedValue(createMockClient());
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.Order.create.mockResolvedValue(order);
    mockModels.OrderDetail.create.mockResolvedValue({});
    mockModels.Order.findOne.mockResolvedValue({ ...order, details: [], client: {}, user: {} });

    await orderService.create(validData, 1, 1);

    expect(mockModels.InventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'out',
        quantity:      2,
        product_id:    1,
      }),
      expect.anything()
    );
  });

  it('lanza 400 si items está vacío', async () => {
    await expect(orderService.create({ client_id: 1, items: [] }, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('lanza 404 si el cliente no existe', async () => {
    mockModels.Client.findOne.mockResolvedValue(null);
    await expect(orderService.create(validData, 1, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 404 si el producto no existe o está inactivo', async () => {
    mockModels.Client.findOne.mockResolvedValue(createMockClient());
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(orderService.create(validData, 1, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateStatus ──────────────────────────────────────────────────────────────
describe('orderService.updateStatus', () => {
  it('seller puede confirmar su propia orden pendiente', async () => {
    const order = createMockOrder({ status: 'pending', user_id: 5 });
    mockModels.Order.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, status: 'confirmed', details: [], client: {}, user: {} });

    await orderService.updateStatus(1, 'confirmed', 1, 5, 'seller');
    expect(order.update).toHaveBeenCalledWith({ status: 'confirmed' });
  });

  it('seller NO puede confirmar una orden ajena', async () => {
    const order = createMockOrder({ status: 'pending', user_id: 99 });
    mockModels.Order.findOne.mockResolvedValue(order);
    await expect(orderService.updateStatus(1, 'confirmed', 1, 5, 'seller'))
      .rejects.toMatchObject({ status: 403 });
  });

  it('lanza 400 para transición inválida', async () => {
    const order = createMockOrder({ status: 'delivered' });
    mockModels.Order.findOne.mockResolvedValue(order);
    await expect(orderService.updateStatus(1, 'confirmed', 1, 1, 'admin'))
      .rejects.toMatchObject({ status: 400 });
  });

  it('cancelación crea movimiento de inventario (entrada) por cada ítem', async () => {
    const order   = createMockOrder({ status: 'confirmed' });
    const product = createMockProduct({ stock: 5 });
    const detail  = createMockOrderDetail({ quantity: 3, product_id: 1 });

    mockModels.Order.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, status: 'cancelled', details: [], client: {}, user: {} });
    mockModels.OrderDetail.findAll.mockResolvedValue([detail]);
    mockModels.Product.findByPk.mockResolvedValue(product);

    await orderService.updateStatus(1, 'cancelled', 1, 1, 'admin');

    expect(mockModels.InventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'in',
        quantity:      3,
        product_id:    1,
      }),
      expect.anything()
    );
    expect(order.update).toHaveBeenCalledWith({ status: 'cancelled' }, expect.anything());
  });

  it('lanza 404 si la orden no existe', async () => {
    mockModels.Order.findOne.mockResolvedValue(null);
    await expect(orderService.updateStatus(999, 'confirmed', 1, 1, 'admin'))
      .rejects.toMatchObject({ status: 404 });
  });
});
