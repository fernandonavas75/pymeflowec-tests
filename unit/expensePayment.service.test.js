'use strict';

const { createMockExpense, createMockExpensePayment, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  ExpensePayment: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  Expense:        { findOne: jest.fn() },
  User:           { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const expensePaymentService = require('../../pymeflowec-backend/src/services/expensePayment.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('expensePaymentService.create', () => {
  const data = { expense_id: 1, amount: 50, payment_method: 'EFECTIVO' };

  it('throws 404 if expense not found', async () => {
    mockModels.Expense.findOne.mockResolvedValue(null);
    await expect(expensePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if expense is annulled', async () => {
    mockModels.Expense.findOne.mockResolvedValue(createMockExpense({ payment_status: 'ANULADO' }));
    await expect(expensePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if expense is already fully paid', async () => {
    mockModels.Expense.findOne.mockResolvedValue(createMockExpense({ payment_status: 'PAGADO' }));
    await expect(expensePaymentService.create(data, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('creates payment and recalculates status', async () => {
    const expense = createMockExpense({ amount: '100.00' });
    const payment = createMockExpensePayment({ amount: '50.00' });

    mockModels.Expense.findOne.mockResolvedValue(expense);
    mockModels.ExpensePayment.create.mockResolvedValue(payment);
    mockModels.ExpensePayment.findAll.mockResolvedValue([payment]);

    const result = await expensePaymentService.create(data, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.ExpensePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ expense_id: 1, company_id: 1, payment_method: 'EFECTIVO' }),
      expect.anything()
    );
    expect(expense.update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'PARCIAL' }),
      expect.anything()
    );
  });
});

// ── annul ─────────────────────────────────────────────────────────────────────
describe('expensePaymentService.annul', () => {
  it('throws 404 if payment not found', async () => {
    mockModels.ExpensePayment.findOne.mockResolvedValue(null);
    await expect(expensePaymentService.annul(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if payment already annulled', async () => {
    mockModels.ExpensePayment.findOne.mockResolvedValue(createMockExpensePayment({ status: 'ANULADO' }));
    await expect(expensePaymentService.annul(1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('annuls payment and recalculates expense status', async () => {
    const payment = createMockExpensePayment({ expense_id: 1 });
    const expense = createMockExpense({ amount: '100.00' });

    mockModels.ExpensePayment.findOne.mockResolvedValue(payment);
    mockModels.Expense.findOne.mockResolvedValue(expense);
    mockModels.ExpensePayment.findAll.mockResolvedValue([]);

    await expensePaymentService.annul(1, 1);
    expect(payment.update).toHaveBeenCalledWith({ status: 'ANULADO' }, expect.anything());
    expect(expense.update).toHaveBeenCalledWith(
      { payment_status: 'PENDIENTE' },
      expect.anything()
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('expensePaymentService.getById', () => {
  it('returns payment when found', async () => {
    const payment = createMockExpensePayment();
    mockModels.ExpensePayment.findOne.mockResolvedValue(payment);
    const result = await expensePaymentService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if payment not found', async () => {
    mockModels.ExpensePayment.findOne.mockResolvedValue(null);
    await expect(expensePaymentService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
