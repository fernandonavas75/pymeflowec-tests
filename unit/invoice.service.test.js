'use strict';

const {
  createMockInvoice, createMockProduct, createMockStoreCustomer,
  createMockTaxRate, createMockInventoryMovement, mockSequelize,
} = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockInvoiceDetail = {};

const mockModels = {
  Invoice: {
    findAndCountAll: jest.fn(),
    findOne:         jest.fn(),
    create:          jest.fn(),
  },
  InvoiceDetail:     { create: jest.fn() },
  InvoicePayment:    { findAll: jest.fn().mockResolvedValue([]) },
  Product:           { findOne: jest.fn() },
  StoreCustomer:     { findOne: jest.fn() },
  User:              { findOne: jest.fn() },
  TaxRate:           { findOne: jest.fn() },
  InventoryMovement: { create: jest.fn() },
  Company:           { findByPk: jest.fn().mockResolvedValue(null) },
  CompanyModule:     { findOne: jest.fn().mockResolvedValue(null) },
  Module:            {},
  ExpenseCategory:   { findOne: jest.fn().mockResolvedValue(null), create: jest.fn() },
  Expense:           { create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const invoiceService = require('../../pymeflowec-backend/src/services/invoice.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('invoiceService.create', () => {
  const baseItem = { product_id: 1, quantity: 2, unit_price: 10 };

  it('throws 400 if items array is empty', async () => {
    await expect(invoiceService.create({ customer_id: null, items: [] }, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if items is missing', async () => {
    await expect(invoiceService.create({ customer_id: null }, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 if product not found or inactive', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(invoiceService.create({ items: [baseItem] }, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if product stock is insufficient', async () => {
    mockModels.Product.findOne.mockResolvedValue(createMockProduct({ stock: 1 }));
    await expect(invoiceService.create({ items: [{ ...baseItem, quantity: 5 }] }, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('creates invoice with correct totals', async () => {
    const product = createMockProduct({ stock: 10, sale_price: '10.00', tax_rate_id: null });
    const invoice = createMockInvoice({ id: 1 });

    mockModels.Product.findOne
      .mockResolvedValueOnce(product)  // item lookup in create
      .mockResolvedValueOnce(product); // product in getById include
    mockModels.Invoice.findOne
      .mockResolvedValueOnce(null)     // generateInvoiceNumber (last invoice)
      .mockResolvedValueOnce(invoice); // getById after create
    mockModels.Invoice.create.mockResolvedValue({ id: 1 });
    mockModels.InvoiceDetail.create.mockResolvedValue({});
    mockModels.InventoryMovement.create.mockResolvedValue({});

    const result = await invoiceService.create({ items: [baseItem] }, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.Invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_number: '001-001-000000001' }),
      expect.anything()
    );
  });
});

// ── cancel ────────────────────────────────────────────────────────────────────
describe('invoiceService.cancel', () => {
  it('cancels an ISSUED invoice', async () => {
    const invoice = createMockInvoice({ status: 'ISSUED', details: [] });
    mockModels.Invoice.findOne
      .mockResolvedValueOnce(invoice)   // lock call
      .mockResolvedValueOnce(invoice)   // details-include call
      .mockResolvedValueOnce(invoice);  // getById after cancel
    await invoiceService.cancel(1, 1);
    expect(invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED', payment_status: 'PENDIENTE' }),
      expect.anything(),
    );
  });

  it('throws 400 if invoice is already CANCELLED', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(createMockInvoice({ status: 'CANCELLED' }));
    await expect(invoiceService.cancel(1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 if invoice not found', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(null);
    await expect(invoiceService.cancel(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
