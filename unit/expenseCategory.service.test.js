'use strict';

const { createMockExpenseCategory, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  ExpenseCategory: {
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
  },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const expenseCategoryService = require('../../pymeflowec-backend/src/services/expenseCategory.service');

beforeEach(() => jest.clearAllMocks());

// ── list ──────────────────────────────────────────────────────────────────────
describe('expenseCategoryService.list', () => {
  it('returns paginated categories for company', async () => {
    const cat = createMockExpenseCategory();
    mockModels.ExpenseCategory.findAndCountAll.mockResolvedValue({ count: 1, rows: [cat] });
    const result = await expenseCategoryService.list(1, { limit: 10, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.rows[0].id).toBe(1);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('expenseCategoryService.getById', () => {
  it('returns category when found', async () => {
    const cat = createMockExpenseCategory();
    mockModels.ExpenseCategory.findOne.mockResolvedValue(cat);
    const result = await expenseCategoryService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if category not found', async () => {
    mockModels.ExpenseCategory.findOne.mockResolvedValue(null);
    await expect(expenseCategoryService.getById(999, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── create ────────────────────────────────────────────────────────────────────
describe('expenseCategoryService.create', () => {
  it('creates expense category correctly', async () => {
    const cat = createMockExpenseCategory();
    mockModels.ExpenseCategory.create.mockResolvedValue(cat);

    const result = await expenseCategoryService.create(
      { name: 'Operativo Test', category_type: 'OPERATIVO' }, 1
    );
    expect(result).toBeDefined();
    expect(mockModels.ExpenseCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, name: 'Operativo Test', category_type: 'OPERATIVO' })
    );
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('expenseCategoryService.update', () => {
  it('updates category fields', async () => {
    const cat = createMockExpenseCategory();
    mockModels.ExpenseCategory.findOne.mockResolvedValue(cat);

    await expenseCategoryService.update(1, { name: 'Nuevo Nombre', is_active: false }, 1);
    expect(cat.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nuevo Nombre', is_active: false })
    );
  });

  it('throws 404 if category not found', async () => {
    mockModels.ExpenseCategory.findOne.mockResolvedValue(null);
    await expect(expenseCategoryService.update(999, { name: 'X' }, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('expenseCategoryService.remove', () => {
  it('destroys the category', async () => {
    const cat = createMockExpenseCategory();
    mockModels.ExpenseCategory.findOne.mockResolvedValue(cat);
    await expenseCategoryService.remove(1, 1);
    expect(cat.destroy).toHaveBeenCalled();
  });

  it('throws 404 if category not found', async () => {
    mockModels.ExpenseCategory.findOne.mockResolvedValue(null);
    await expect(expenseCategoryService.remove(999, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});
