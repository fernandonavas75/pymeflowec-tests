'use strict';

// Tests for company.service.js (replaces old order.service)
const { createMockCompany, createMockStoreCustomer, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Company:       { findByPk: jest.fn(), findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  StoreCustomer: { create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const companyService = require('../../pymeflowec-backend/src/services/company.service');

beforeEach(() => jest.clearAllMocks());

// ── getById ────────────────────────────────────────────────────────────────────
describe('companyService.getById', () => {
  it('returns company when found', async () => {
    const company = createMockCompany();
    mockModels.Company.findByPk.mockResolvedValue(company);

    const result = await companyService.getById(1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if company not found', async () => {
    mockModels.Company.findByPk.mockResolvedValue(null);
    await expect(companyService.getById(999)).rejects.toMatchObject({ status: 404 });
  });
});

// ── create ────────────────────────────────────────────────────────────────────
describe('companyService.create', () => {
  const data = { name: 'Nueva Empresa', ruc: '1790000000001' };

  it('creates company and auto-creates Consumidor Final', async () => {
    const company = createMockCompany({ id: 99 });
    mockModels.Company.findOne.mockResolvedValue(null);  // no ruc conflict
    mockModels.Company.create.mockResolvedValue(company);
    mockModels.StoreCustomer.create.mockResolvedValue({});

    const result = await companyService.create(data);
    expect(mockModels.Company.create).toHaveBeenCalled();
    expect(mockModels.StoreCustomer.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer_type: 'FINAL_CONSUMER', document_number: '9999999999999' }),
      expect.anything()
    );
  });

  it('throws 409 if RUC already registered', async () => {
    mockModels.Company.findOne.mockResolvedValue(createMockCompany());
    await expect(companyService.create(data)).rejects.toMatchObject({ status: 409 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('companyService.update', () => {
  it('updates allowed fields only', async () => {
    const company = createMockCompany();
    mockModels.Company.findByPk.mockResolvedValue(company);

    await companyService.update(1, { name: 'Nuevo Nombre', ruc: '0000000000000' });
    // ruc is not in the allowed list, should not be passed
    expect(company.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ ruc: '0000000000000' })
    );
    expect(company.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nuevo Nombre' })
    );
  });

  it('throws 404 if company not found', async () => {
    mockModels.Company.findByPk.mockResolvedValue(null);
    await expect(companyService.update(999, { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ── setStatus ──────────────────────────────────────────────────────────────────
describe('companyService.setStatus', () => {
  it('updates company status', async () => {
    const company = createMockCompany();
    mockModels.Company.findByPk.mockResolvedValue(company);
    await companyService.setStatus(1, 'SUSPENDED');
    expect(company.update).toHaveBeenCalledWith({ status: 'SUSPENDED' });
  });

  it('throws 404 if company not found', async () => {
    mockModels.Company.findByPk.mockResolvedValue(null);
    await expect(companyService.setStatus(999, 'SUSPENDED')).rejects.toMatchObject({ status: 404 });
  });
});
