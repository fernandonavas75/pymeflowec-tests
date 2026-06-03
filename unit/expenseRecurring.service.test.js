'use strict';

const { createMockExpenseRecurring, createMockExpenseCategory, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  ExpenseRecurring: {
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
  },
  ExpenseCategory: { findOne: jest.fn() },
  Supplier:        { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const expenseRecurringService = require('../../pymeflowec-backend/src/services/expenseRecurring.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('expenseRecurringService.create', () => {
  const base = { category_id: 1, description: 'Arriendo', amount: 200, day_of_month: 1 };

  it('throws 400 if neither supplier_id nor supplier_name_free provided', async () => {
    await expect(expenseRecurringService.create(base, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('creates with supplier_id', async () => {
    const rec = createMockExpenseRecurring({ supplier_id: 2, supplier_name_free: null });
    mockModels.ExpenseRecurring.create.mockResolvedValue(rec);

    const result = await expenseRecurringService.create({ ...base, supplier_id: 2 }, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.ExpenseRecurring.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, supplier_id: 2, day_of_month: 1 })
    );
  });

  it('creates with supplier_name_free', async () => {
    const rec = createMockExpenseRecurring();
    mockModels.ExpenseRecurring.create.mockResolvedValue(rec);

    const result = await expenseRecurringService.create(
      { ...base, supplier_name_free: 'Propietario' }, 1, 1
    );
    expect(result).toBeDefined();
    expect(mockModels.ExpenseRecurring.create).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_name_free: 'Propietario' })
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('expenseRecurringService.getById', () => {
  it('returns record when found', async () => {
    const rec = createMockExpenseRecurring();
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(rec);
    const result = await expenseRecurringService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if not found', async () => {
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(null);
    await expect(expenseRecurringService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('expenseRecurringService.update', () => {
  it('updates allowed fields', async () => {
    const rec = createMockExpenseRecurring();
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(rec);

    await expenseRecurringService.update(1, { amount: 300, is_active: false }, 1);
    expect(rec.update).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 300, is_active: false })
    );
  });

  it('throws 404 if not found', async () => {
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(null);
    await expect(expenseRecurringService.update(999, { amount: 100 }, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('expenseRecurringService.remove', () => {
  it('destroys the record', async () => {
    const rec = createMockExpenseRecurring();
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(rec);
    await expenseRecurringService.remove(1, 1);
    expect(rec.destroy).toHaveBeenCalled();
  });

  it('throws 404 if not found', async () => {
    mockModels.ExpenseRecurring.findOne.mockResolvedValue(null);
    await expect(expenseRecurringService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
