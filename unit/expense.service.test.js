'use strict';

const { createMockExpense, createMockExpensePayment, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Expense:         { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  ExpenseCategory: { findOne: jest.fn() },
  ExpensePayment:  { findAll: jest.fn(), update: jest.fn() },
  Supplier:        { findOne: jest.fn() },
  User:            { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const expenseService = require('../../pymeflowec-backend/src/services/expense.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('expenseService.create', () => {
  const base = { category_id: 1, description: 'Test', amount: 100, expense_date: '2026-01-01' };

  it('creates expense with supplier_id', async () => {
    const expense = createMockExpense({ supplier_id: 1, supplier_name_free: null });
    mockModels.Expense.create.mockResolvedValue(expense);

    const result = await expenseService.create({ ...base, supplier_id: 1 }, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.Expense.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, category_id: 1, supplier_id: 1, payment_status: 'PENDIENTE' })
    );
  });

  it('creates expense with supplier_name_free', async () => {
    const expense = createMockExpense();
    mockModels.Expense.create.mockResolvedValue(expense);

    const result = await expenseService.create({ ...base, supplier_name_free: 'Libre' }, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.Expense.create).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_name_free: 'Libre' })
    );
  });

  it('throws 400 if neither supplier_id nor supplier_name_free provided', async () => {
    await expect(expenseService.create(base, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('expenseService.getById', () => {
  it('throws 404 if expense not found', async () => {
    mockModels.Expense.findOne.mockResolvedValue(null);
    await expect(expenseService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('returns expense when found', async () => {
    const expense = createMockExpense();
    mockModels.Expense.findOne.mockResolvedValue(expense);
    const result = await expenseService.getById(1, 1);
    expect(result.id).toBe(1);
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('expenseService.update', () => {
  it('throws 404 if expense not found', async () => {
    mockModels.Expense.findOne.mockResolvedValue(null);
    await expect(expenseService.update(999, { description: 'X' }, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if expense is annulled', async () => {
    mockModels.Expense.findOne.mockResolvedValue(createMockExpense({ payment_status: 'ANULADO' }));
    await expect(expenseService.update(1, { description: 'X' }, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('updates allowed fields', async () => {
    const expense = createMockExpense();
    mockModels.Expense.findOne
      .mockResolvedValueOnce(expense)   // update lookup
      .mockResolvedValueOnce(expense);  // getById after update
    await expenseService.update(1, { description: 'Updated', amount: 200 }, 1);
    expect(expense.update).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Updated', amount: 200 })
    );
  });
});

// ── annul ─────────────────────────────────────────────────────────────────────
describe('expenseService.annul', () => {
  it('throws 404 if expense not found', async () => {
    mockModels.Expense.findOne.mockResolvedValue(null);
    await expect(expenseService.annul(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if expense already annulled', async () => {
    mockModels.Expense.findOne.mockResolvedValue(createMockExpense({ payment_status: 'ANULADO' }));
    await expect(expenseService.annul(1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('annuls expense and its payments', async () => {
    const expense = createMockExpense();
    mockModels.Expense.findOne.mockResolvedValue(expense);
    mockModels.ExpensePayment.update.mockResolvedValue([1]);

    await expenseService.annul(1, 1);

    expect(mockModels.ExpensePayment.update).toHaveBeenCalledWith(
      { status: 'ANULADO' },
      expect.anything()
    );
    expect(expense.update).toHaveBeenCalledWith(
      { payment_status: 'ANULADO' },
      expect.anything()
    );
  });
});
