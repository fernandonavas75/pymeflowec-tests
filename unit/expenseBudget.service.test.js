'use strict';

const { createMockExpenseBudget, createMockExpenseCategory, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  ExpenseBudget:   { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  ExpenseCategory: { findOne: jest.fn() },
  User:            { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const expenseBudgetService = require('../../pymeflowec-backend/src/services/expenseBudget.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('expenseBudgetService.create', () => {
  const base = { category_id: 1, period_year: 2026, budgeted_amount: 500 };

  it('throws 400 if MONTHLY budget has no period_month', async () => {
    await expect(
      expenseBudgetService.create({ ...base, period_type: 'MONTHLY' }, 1, 1)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if ANNUAL budget includes period_month', async () => {
    await expect(
      expenseBudgetService.create({ ...base, period_type: 'ANNUAL', period_month: 3 }, 1, 1)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('creates monthly budget successfully', async () => {
    const budget = createMockExpenseBudget();
    mockModels.ExpenseBudget.create.mockResolvedValue(budget);

    const result = await expenseBudgetService.create(
      { ...base, period_type: 'MONTHLY', period_month: 1 }, 1, 1
    );
    expect(result).toBeDefined();
    expect(mockModels.ExpenseBudget.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, period_type: 'MONTHLY', period_month: 1 })
    );
  });

  it('creates annual budget successfully', async () => {
    const budget = createMockExpenseBudget({ period_type: 'ANNUAL', period_month: null });
    mockModels.ExpenseBudget.create.mockResolvedValue(budget);

    const result = await expenseBudgetService.create(
      { ...base, period_type: 'ANNUAL' }, 1, 1
    );
    expect(result).toBeDefined();
    expect(mockModels.ExpenseBudget.create).toHaveBeenCalledWith(
      expect.objectContaining({ period_type: 'ANNUAL', period_month: null })
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('expenseBudgetService.getById', () => {
  it('returns budget when found', async () => {
    const budget = createMockExpenseBudget();
    mockModels.ExpenseBudget.findOne.mockResolvedValue(budget);
    const result = await expenseBudgetService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if budget not found', async () => {
    mockModels.ExpenseBudget.findOne.mockResolvedValue(null);
    await expect(expenseBudgetService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('expenseBudgetService.update', () => {
  it('updates budget amount and notes', async () => {
    const budget = createMockExpenseBudget();
    mockModels.ExpenseBudget.findOne.mockResolvedValue(budget);

    await expenseBudgetService.update(1, { budgeted_amount: 800, notes: 'Revisado' }, 1);
    expect(budget.update).toHaveBeenCalledWith(
      expect.objectContaining({ budgeted_amount: 800, notes: 'Revisado' })
    );
  });

  it('throws 404 if budget not found', async () => {
    mockModels.ExpenseBudget.findOne.mockResolvedValue(null);
    await expect(expenseBudgetService.update(999, { budgeted_amount: 100 }, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('expenseBudgetService.remove', () => {
  it('destroys the budget', async () => {
    const budget = createMockExpenseBudget();
    mockModels.ExpenseBudget.findOne.mockResolvedValue(budget);
    await expenseBudgetService.remove(1, 1);
    expect(budget.destroy).toHaveBeenCalled();
  });

  it('throws 404 if budget not found', async () => {
    mockModels.ExpenseBudget.findOne.mockResolvedValue(null);
    await expect(expenseBudgetService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
