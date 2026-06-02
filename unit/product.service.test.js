'use strict';

const {
  createMockProduct, createMockProductCategory, createMockSupplier, createMockTaxRate,
  createMockInventoryMovement, mockSequelize,
} = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Product:         { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  ProductCategory: { findOne: jest.fn() },
  Supplier:        { findOne: jest.fn() },
  TaxRate:         { findOne: jest.fn() },
  InventoryMovement: { create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const productService = require('../../pymeflowec-backend/src/services/product.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('productService.create', () => {
  const data = { name: 'Producto X', sale_price: 10, purchase_price: 5 };

  it('creates product with default stock 0 when not specified', async () => {
    const product = createMockProduct({ stock: 0 });
    mockModels.Product.create.mockResolvedValue({ id: 1 });
    mockModels.Product.findOne.mockResolvedValue(product);

    const result = await productService.create(data, 1);
    expect(result.stock).toBe(0);
    expect(mockModels.Product.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, stock: 0 })
    );
  });

  it('throws 404 if category_id does not belong to company', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(null);
    await expect(productService.create({ ...data, category_id: 99 }, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 if supplier_id does not belong to company', async () => {
    mockModels.ProductCategory.findOne.mockResolvedValue(createMockProductCategory());
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(productService.create({ ...data, supplier_id: 99 }, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 if tax_rate_id does not belong to company', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(createMockSupplier());
    mockModels.TaxRate.findOne.mockResolvedValue(null);
    await expect(productService.create({ ...data, tax_rate_id: 99 }, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── adjust ────────────────────────────────────────────────────────────────────
describe('productService.adjust', () => {
  it('IN movement increases stock', async () => {
    const product  = createMockProduct({ stock: 10 });
    const movement = createMockInventoryMovement({ movement_type: 'IN', quantity: 5 });
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.InventoryMovement.create.mockResolvedValue(movement);

    await productService.adjust(1, 5, 'IN', 'restock', 1, 1);

    expect(product.update).toHaveBeenCalledWith({ stock: 15 });
    expect(mockModels.InventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'IN', quantity: 5 })
    );
  });

  it('OUT movement decreases stock', async () => {
    const product  = createMockProduct({ stock: 10 });
    const movement = createMockInventoryMovement({ movement_type: 'OUT', quantity: 3 });
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.InventoryMovement.create.mockResolvedValue(movement);

    await productService.adjust(1, 3, 'OUT', null, 1, 1);
    expect(product.update).toHaveBeenCalledWith({ stock: 7 });
  });

  it('throws 400 if OUT quantity exceeds stock', async () => {
    mockModels.Product.findOne.mockResolvedValue(createMockProduct({ stock: 2 }));
    await expect(productService.adjust(1, 5, 'OUT', null, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 if product not found', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.adjust(999, 1, 'IN', null, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('productService.setStatus', () => {
  it('updates product status', async () => {
    const product = createMockProduct();
    mockModels.Product.findOne
      .mockResolvedValueOnce(product)   // find for update
      .mockResolvedValueOnce(product);  // getById after update
    await productService.setStatus(1, 'INACTIVE', 1);
    expect(product.update).toHaveBeenCalledWith({ status: 'INACTIVE' });
  });

  it('throws 404 if product not found', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.setStatus(999, 'INACTIVE', 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('productService.remove', () => {
  it('destroys the product', async () => {
    const product = createMockProduct();
    mockModels.Product.findOne.mockResolvedValue(product);
    await productService.remove(1, 1);
    expect(product.destroy).toHaveBeenCalled();
  });

  it('throws 404 if product not found', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
