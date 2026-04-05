'use strict';

const {
  createMockProduct, createMockOrder,
  createMockOrderDetail, createMockInvoice, mockSequelize,
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

// Org con campos SRI requeridos para generar el número de factura
const createMockOrgSRI = (overrides = {}) => ({
  id:                       1,
  name:                     'Test Org',
  ruc:                      '9999999990001',
  status:                   'active',
  sri_establecimiento:      '001',
  sri_punto_emision:        '001',
  sri_secuencial_factura:   0,
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const mockModels = {
  Invoice:       { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  InvoiceDetail: { create: jest.fn() },
  Order:         { findOne: jest.fn() },
  OrderDetail:   { findAll: jest.fn() },
  Product:       { findOne: jest.fn() },
  Client:        {},
  User:          {},
  Payment:       {},
  Organization:  { findByPk: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const invoiceService = require('../../pymeflowec-backend/src/services/invoice.service');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockSeq.transaction.mockImplementation(async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
});

// ── createFromOrder ───────────────────────────────────────────────────────────
describe('invoiceService.createFromOrder', () => {
  it('crea factura desde una orden válida con número SRI', async () => {
    const order   = createMockOrder({ status: 'confirmed', details: [createMockOrderDetail()] });
    const org     = createMockOrgSRI();
    const invoice = createMockInvoice({ id: 10, invoice_number: '001-001-000000001' });

    mockModels.Order.findOne.mockResolvedValue(order);
    mockModels.Invoice.findOne
      .mockResolvedValueOnce(null)      // no existe factura previa
      .mockResolvedValueOnce(invoice);  // getById al final
    mockModels.Organization.findByPk.mockResolvedValue(org);
    mockModels.Invoice.create.mockResolvedValue(invoice);
    mockModels.InvoiceDetail.create.mockResolvedValue({});

    const result = await invoiceService.createFromOrder(1, 1);
    expect(result).toBeDefined();
    // El número se genera como: sri_establecimiento-sri_punto_emision-000000001
    expect(mockModels.Invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_number: '001-001-000000001' }),
      expect.anything()
    );
  });

  it('lanza 404 si la orden no existe', async () => {
    mockModels.Order.findOne.mockResolvedValue(null);
    await expect(invoiceService.createFromOrder(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 400 si la orden está cancelada', async () => {
    mockModels.Order.findOne.mockResolvedValue(createMockOrder({ status: 'cancelled', details: [] }));
    await expect(invoiceService.createFromOrder(1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('lanza 409 si ya existe una factura para esa orden', async () => {
    mockModels.Order.findOne.mockResolvedValue(createMockOrder({ status: 'confirmed', details: [] }));
    mockModels.Invoice.findOne.mockResolvedValue(createMockInvoice()); // ya existe
    await expect(invoiceService.createFromOrder(1, 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ── createManual ──────────────────────────────────────────────────────────────
describe('invoiceService.createManual', () => {
  it('crea factura manual con subtotal correcto (IVA se calcula por ítem, tax=0 en cabecera)', async () => {
    const product = createMockProduct({ unit_price: '100.00', cost_price: '50.00' });
    const org     = createMockOrgSRI();
    const invoice = createMockInvoice({ id: 20 });

    mockModels.Organization.findByPk.mockResolvedValue(org);
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.Invoice.create.mockResolvedValue(invoice);
    mockModels.InvoiceDetail.create.mockResolvedValue({});
    mockModels.Invoice.findOne.mockResolvedValue(invoice);

    await invoiceService.createManual({ items: [{ product_id: 1, quantity: 2, unit_price: 100 }] }, 1);

    const createCall = mockModels.Invoice.create.mock.calls[0][0];
    expect(createCall.subtotal).toBe(200);
    // En la v7 el IVA de cabecera es 0 (se aplica por línea de detalle según tax_rate del producto)
    expect(createCall.tax).toBe(0);
    expect(createCall.total).toBe(200);
  });

  it('lanza 400 si items está vacío', async () => {
    await expect(invoiceService.createManual({ items: [] }, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('lanza 404 si el producto está inactivo o no existe', async () => {
    mockModels.Organization.findByPk.mockResolvedValue(createMockOrgSRI());
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(
      invoiceService.createManual({ items: [{ product_id: 99, quantity: 1 }] }, 1)
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('invoiceService.setStatus', () => {
  it('no permite modificar una factura cancelada', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(createMockInvoice({ status: 'cancelled' }));
    await expect(invoiceService.setStatus(1, 'paid', 1)).rejects.toMatchObject({ status: 400 });
  });
});
