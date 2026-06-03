'use strict';

const { createMockProduct, createMockInventoryMovement, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  InventoryMovement: { findAndCountAll: jest.fn(), create: jest.fn() },
  Product:           { findOne: jest.fn() },
  User:              { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const inventoryMovementService = require('../../pymeflowec-backend/src/services/inventoryMovement.service');

beforeEach(() => jest.clearAllMocks());

// ── createManual ──────────────────────────────────────────────────────────────
describe('inventoryMovementService.createManual', () => {
  const base = { product_id: 1, quantity: 5, reference_type: 'MANUAL' };

  it('throws 404 if product not found or inactive', async () => {
    mockModels.Product.findOne.mockResolvedValue(null);
    await expect(inventoryMovementService.createManual({ ...base, movement_type: 'IN' }, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('increases stock on IN movement', async () => {
    const product  = createMockProduct({ stock: 10 });
    const movement = createMockInventoryMovement({ movement_type: 'IN', quantity: 5 });
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.InventoryMovement.create.mockResolvedValue(movement);

    const result = await inventoryMovementService.createManual(
      { ...base, movement_type: 'IN' }, 1, 1
    );
    expect(result).toBeDefined();
    expect(product.update).toHaveBeenCalledWith({ stock: 15 }, expect.anything());
  });

  it('decreases stock on OUT movement', async () => {
    const product  = createMockProduct({ stock: 10 });
    const movement = createMockInventoryMovement({ movement_type: 'OUT', quantity: 3 });
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.InventoryMovement.create.mockResolvedValue(movement);

    await inventoryMovementService.createManual(
      { ...base, movement_type: 'OUT', quantity: 3 }, 1, 1
    );
    expect(product.update).toHaveBeenCalledWith({ stock: 7 }, expect.anything());
  });

  it('throws 400 if OUT quantity exceeds stock', async () => {
    mockModels.Product.findOne.mockResolvedValue(createMockProduct({ stock: 2 }));
    await expect(
      inventoryMovementService.createManual({ ...base, movement_type: 'OUT', quantity: 5 }, 1, 1)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('sets stock to absolute value on ADJUSTMENT movement', async () => {
    const product  = createMockProduct({ stock: 10 });
    const movement = createMockInventoryMovement({ movement_type: 'ADJUSTMENT', quantity: 50 });
    mockModels.Product.findOne.mockResolvedValue(product);
    mockModels.InventoryMovement.create.mockResolvedValue(movement);

    await inventoryMovementService.createManual(
      { ...base, movement_type: 'ADJUSTMENT', quantity: 50 }, 1, 1
    );
    expect(product.update).toHaveBeenCalledWith({ stock: 50 }, expect.anything());
  });
});

// ── list ──────────────────────────────────────────────────────────────────────
describe('inventoryMovementService.list', () => {
  it('returns paginated movements for company', async () => {
    const movement = createMockInventoryMovement();
    mockModels.InventoryMovement.findAndCountAll.mockResolvedValue({ count: 1, rows: [movement] });

    const result = await inventoryMovementService.list(1, { limit: 10, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.rows[0].id).toBe(1);
  });
});
