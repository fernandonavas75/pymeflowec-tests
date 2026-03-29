'use strict';

const { createMockSupplier, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  Supplier: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const supplierService = require('../../pymeflowec-backend/src/services/supplier.service');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('supplierService.create', () => {
  const validData = {
    business_name: 'Mi Proveedor S.A.',
    email:         'proveedor@test.com',
  };

  it('crea proveedor correctamente', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.create.mockResolvedValue(supplier);

    const result = await supplierService.create(validData, 1);
    expect(result).toBeDefined();
    expect(mockModels.Supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({ business_name: 'Mi Proveedor S.A.', organization_id: 1 })
    );
  });
});

// ── update ─────────────────────────────────────────────────────────────────────
describe('supplierService.update', () => {
  it('actualiza el proveedor correctamente', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.findOne.mockResolvedValue(supplier);

    await supplierService.update(1, { business_name: 'Nuevo Nombre S.A.' }, 1);
    expect(supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({ business_name: 'Nuevo Nombre S.A.' })
    );
  });

  it('lanza 404 si el proveedor no existe', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(supplierService.update(999, {}, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('supplierService.remove', () => {
  it('elimina (soft delete) el proveedor', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.findOne.mockResolvedValue(supplier);

    await supplierService.remove(1, 1);
    expect(supplier.destroy).toHaveBeenCalled();
  });

  it('lanza 404 si el proveedor no existe', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(supplierService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('supplierService.setStatus', () => {
  it('actualiza el estado del proveedor', async () => {
    const supplier = createMockSupplier();
    mockModels.Supplier.findOne.mockResolvedValue(supplier);

    await supplierService.setStatus(1, 'inactive', 1);
    expect(supplier.update).toHaveBeenCalledWith({ status: 'inactive' });
  });

  it('lanza 404 si el proveedor no existe', async () => {
    mockModels.Supplier.findOne.mockResolvedValue(null);
    await expect(supplierService.setStatus(999, 'inactive', 1)).rejects.toMatchObject({ status: 404 });
  });
});
