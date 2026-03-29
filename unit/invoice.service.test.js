'use strict';

const {
  createMockOrg, createMockProduct, createMockOrder,
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

const mockModels = {
  Invoice:       { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn(), count: jest.fn() },
  InvoiceDetail: { create: jest.fn() },
  Order:         { findOne: jest.fn() },
  OrderDetail:   { findAll: jest.fn() },
  Product:       { findOne: jest.fn() },
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
  it('crea factura desde una orden válida', async () => {
    const order   = createMockOrder({ status: 'confirmed', details: [createMockOrderDetail()] });
    const org     = createMockOrg({ ruc: '9999999990001' });
    const invoice = createMockInvoice({ id: 10 });

    mockModels.Order.findOne.mockResolvedValue(order);
    mockModels.Invoice.findOne
      .mockResolvedValueOnce(null)          // no existe factura previa
      .mockResolvedValueOnce(invoice);      // getById al final
    mockModels.Organization.findByPk.mockResolvedValue(org);
    mockModels.Invoice.count.mockResolvedValue(0);
    mockModels.Invoice.create.mockResolvedValue(invoice);
    mockModels.InvoiceDetail.create.mockResolvedValue({});

    const result = await invoiceService.createFromOrder(1, 1);
    expect(result).toBeDefined();
    expect(mockModels.Invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_number: 'FAC-9999-000001' }),
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
  it('crea factura manual con cálculo correcto de IVA', async () => {
    const product = createMockProduct({ unit_price: '100.00' });
    const org     = createMockOrg({ tax_rate: 0.12 });
    const invoice = createMockInvoice({ id: 20 });

    mockModels.Organization.findByPk.mockResolvedValue(org);
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.Invoice.count.mockResolvedValue(0);
    mockModels.Invoice.create.mockResolvedValue(invoice);
    mockModels.InvoiceDetail.create.mockResolvedValue({});
    mockModels.Invoice.findOne.mockResolvedValue(invoice);

    await invoiceService.createManual({ items: [{ product_id: 1, quantity: 2, unit_price: 100 }] }, 1);

    const createCall = mockModels.Invoice.create.mock.calls[0][0];
    expect(createCall.subtotal).toBe(200);
    expect(createCall.tax).toBe(24);
    expect(createCall.total).toBe(224);
  });

  it('lanza 400 si items está vacío', async () => {
    await expect(invoiceService.createManual({ items: [] }, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('lanza 404 si el producto está inactivo', async () => {
    mockModels.Organization.findByPk.mockResolvedValue(createMockOrg());
    mockModels.Product.findOne.mockResolvedValue(null); // no encontrado/inactivo
    await expect(
      invoiceService.createManual({ items: [{ product_id: 99, quantity: 1, unit_price: 10 }] }, 1)
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
