'use strict';

const { createMockProductCategory, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  ProductCategory: {
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
  },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const productCategoryService = require('../../pymeflowec-backend/src/services/productCategory.service');

beforeEach(() => jest.clearAllMocks());

// ── list ──────────────────────────────────────────────────────────────────────
describe('productCategoryService.list', () => {
  it('returns paginated categories for company', async () => {
    const cat = createMockProductCategory();
    mockModels.ProductCategory.findAndCountAll.mockResolvedValue({ count: 1, rows: [cat] });

    const result = await productCategoryService.list(1, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(mockModels.ProductCategory.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company_id: 1 } })
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('productCategoryService.getById', () => {
  it('returns category when found', async () => {
    const cat = createMockProductCategory();
    mockModels.ProductCategory.findOne.mockResolvedValue(cat);

    const result = await productCategoryService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if category not found', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(null);
    await expect(productCategoryService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── create ────────────────────────────────────────────────────────────────────
describe('productCategoryService.create', () => {
  const data = { name: 'Lácteos', description: 'Derivados lácteos' };

  it('creates a product category', async () => {
    const cat = createMockProductCategory();
    mockModels.ProductCategory.findOne.mockResolvedValue(null);  // no name conflict
    mockModels.ProductCategory.create.mockResolvedValue(cat);

    const result = await productCategoryService.create(data, 1);
    expect(result).toBeDefined();
    expect(mockModels.ProductCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, name: 'Lácteos' })
    );
  });

  it('throws 409 if category name already exists for company', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(createMockProductCategory());
    await expect(productCategoryService.create(data, 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('productCategoryService.update', () => {
  it('updates category fields', async () => {
    const cat = createMockProductCategory();
    mockModels.ProductCategory.findOne
      .mockResolvedValueOnce(cat)   // getById
      .mockResolvedValueOnce(null); // name conflict check (no conflict)

    await productCategoryService.update(1, { name: 'Bebidas', status: 'ACTIVE' }, 1);
    expect(cat.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bebidas', status: 'ACTIVE' })
    );
  });

  it('throws 409 if new name belongs to a different category', async () => {
    const existing = createMockProductCategory({ id: 1 });
    const conflict  = createMockProductCategory({ id: 2, name: 'Bebidas' });
    mockModels.ProductCategory.findOne
      .mockResolvedValueOnce(existing) // getById
      .mockResolvedValueOnce(conflict); // name conflict check

    await expect(productCategoryService.update(1, { name: 'Bebidas' }, 1))
      .rejects.toMatchObject({ status: 409 });
  });

  it('throws 404 if category not found', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(null);
    await expect(productCategoryService.update(999, { name: 'X' }, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('productCategoryService.remove', () => {
  it('destroys the category', async () => {
    const cat = createMockProductCategory();
    mockModels.ProductCategory.findOne.mockResolvedValue(cat);

    await productCategoryService.remove(1, 1);
    expect(cat.destroy).toHaveBeenCalled();
  });

  it('throws 404 if category not found', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(null);
    await expect(productCategoryService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
