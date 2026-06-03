'use strict';

const { createMockInvoice, createMockInvoicePayment, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  InvoicePayment: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  Invoice:        { findOne: jest.fn() },
  User:           { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const invoicePaymentService = require('../../pymeflowec-backend/src/services/invoicePayment.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('invoicePaymentService.create', () => {
  const data = { invoice_id: 1, amount: 100, payment_method: 'EFECTIVO' };

  it('throws 404 if invoice not found', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(null);
    await expect(invoicePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if invoice is cancelled', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(createMockInvoice({ status: 'CANCELLED' }));
    await expect(invoicePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if invoice is already fully cobrado', async () => {
    mockModels.Invoice.findOne.mockResolvedValue(
      createMockInvoice({ status: 'ISSUED', payment_status: 'COBRADO' })
    );
    await expect(invoicePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('creates payment and recalculates invoice payment status', async () => {
    const invoice = createMockInvoice({ total: '100.00', payment_status: 'PENDIENTE' });
    const payment = createMockInvoicePayment({ amount: '100.00' });

    mockModels.Invoice.findOne.mockResolvedValue(invoice);
    mockModels.InvoicePayment.create.mockResolvedValue(payment);
    mockModels.InvoicePayment.findAll.mockResolvedValue([payment]);

    const result = await invoicePaymentService.create(data, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.InvoicePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_id: 1, company_id: 1, payment_method: 'EFECTIVO' }),
      expect.anything()
    );
    expect(invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'COBRADO' }),
      expect.anything()
    );
  });
});

// ── annul ─────────────────────────────────────────────────────────────────────
describe('invoicePaymentService.annul', () => {
  it('throws 404 if payment not found', async () => {
    mockModels.InvoicePayment.findOne.mockResolvedValue(null);
    await expect(invoicePaymentService.annul(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if payment already annulled', async () => {
    mockModels.InvoicePayment.findOne.mockResolvedValue(
      createMockInvoicePayment({ status: 'ANULADO' })
    );
    await expect(invoicePaymentService.annul(1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('annuls payment and recalculates invoice status', async () => {
    const payment = createMockInvoicePayment({ invoice_id: 1 });
    const invoice = createMockInvoice({ total: '100.00', payment_status: 'COBRADO' });

    mockModels.InvoicePayment.findOne.mockResolvedValue(payment);
    mockModels.Invoice.findOne.mockResolvedValue(invoice);
    mockModels.InvoicePayment.findAll.mockResolvedValue([]);

    await invoicePaymentService.annul(1, 1);
    expect(payment.update).toHaveBeenCalledWith({ status: 'ANULADO' }, expect.anything());
    expect(invoice.update).toHaveBeenCalledWith(
      { payment_status: 'PENDIENTE' },
      expect.anything()
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('invoicePaymentService.getById', () => {
  it('returns payment when found', async () => {
    const payment = createMockInvoicePayment();
    mockModels.InvoicePayment.findOne.mockResolvedValue(payment);
    const result = await invoicePaymentService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if payment not found', async () => {
    mockModels.InvoicePayment.findOne.mockResolvedValue(null);
    await expect(invoicePaymentService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
