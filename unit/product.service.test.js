'use strict';

const { createMockProduct, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  Product:          { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  Category:         { findOne: jest.fn() },
  TaxRate:          {},
  PriceHistory:     { create: jest.fn().mockResolvedValue({}) },
  InventoryMovement:{ create: jest.fn().mockResolvedValue({}) },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const productService = require('../../pymeflowec-backend/src/services/product.service');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('productService.create', () => {
  it('crea producto correctamente con stock por defecto 0', async () => {
    const product = createMockProduct({ stock: 0 });
    mockModels.Product.create.mockResolvedValue(product);

    const result = await productService.create({ name: 'Prod A', unit_price: 10 }, 1);
    expect(result).toBeDefined();
    expect(mockModels.Product.create).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 1, stock: 0 })
    );
  });

  it('crea producto con stock proporcionado', async () => {
    const product = createMockProduct({ stock: 50 });
    mockModels.Product.create.mockResolvedValue(product);

    await productService.create({ name: 'Prod B', unit_price: 5, stock: 50 }, 1);
    expect(mockModels.Product.create).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 50 })
    );
  });
});

// ── adjust (reemplaza updateStock) ───────────────────────────────────────────
// El stock ahora se gestiona vía InventoryMovement + trigger de BD.
describe('productService.adjust', () => {
  it('crea un movimiento de inventario correctamente', async () => {
    const product = createMockProduct({ stock: 100 });
    mockModels.Product.findOne.mockResolvedValue(product);

    const result = await productService.adjust(1, 10, 'in', 'Reposición', 1, 1);

    expect(mockModels.InventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 1,
        product_id:      1,
        movement_type:   'in',
        quantity:        10,
      })
    );
    expect(result).toBeDefined();
  });

  it('crea movimiento de salida de inventario', async () => {
    const product = createMockProduct({ stock: 50 });
    mockModels.Product.findOne.mockResolvedValue(product);

    await productService.adjust(1, 5, 'out', 'Venta manual', 1, 1);

    expect(mockModels.InventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'out', quantity: 5 })
    );
  });

  it('lanza 404 si el producto no existe', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.adjust(999, 10, 'in', null, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('productService.remove', () => {
  it('elimina (soft delete) el producto', async () => {
    const product = createMockProduct();
    mockModels.Product.findOne.mockResolvedValue(product);

    await productService.remove(1, 1);
    expect(product.destroy).toHaveBeenCalled();
  });

  it('lanza 404 si el producto no existe', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('productService.setStatus', () => {
  it('cambia el estado del producto', async () => {
    const product = createMockProduct();
    mockModels.Product.findOne.mockResolvedValue(product);

    await productService.setStatus(1, 'inactive', 1);
    expect(product.update).toHaveBeenCalledWith({ status: 'inactive' });
  });

  it('lanza 404 si el producto no existe', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(productService.setStatus(999, 'inactive', 1))
      .rejects.toMatchObject({ status: 404 });
  });
});
