'use strict';

const { createMockSupplier, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Supplier: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const supplierService = require('../../pymeflowec-backend/src/services/supplier.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('supplierService.create', () => {
  const data = { name: 'Mi Proveedor S.A.', email: 'proveedor@test.com' };

  it('creates supplier correctly', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.create.mockResolvedValue(supplier);

    const result = await supplierService.create(data, 1);
    expect(result).toBeDefined();
    expect(mockModels.Supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mi Proveedor S.A.', company_id: 1 })
    );
  });
});

// ── update ─────────────────────────────────────────────────────────────────────
describe('supplierService.update', () => {
  it('updates the supplier', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.findOne.mockResolvedValue(supplier);

    await supplierService.update(1, { name: 'Nuevo Nombre S.A.' }, 1);
    expect(supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nuevo Nombre S.A.' })
    );
  });

  it('throws 404 if supplier not found', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(supplierService.update(999, {}, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('supplierService.remove', () => {
  it('destroys the supplier', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.findOne.mockResolvedValue(supplier);
    await supplierService.remove(1, 1);
    expect(supplier.destroy).toHaveBeenCalled();
  });

  it('throws 404 if supplier not found', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(supplierService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
