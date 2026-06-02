'use strict';

// Tests for module.service.js (replaces old platformModule.service)
const {
  createMockModule, createMockCompanyModule, createMockModuleRequest, mockSequelize,
} = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Module: {
    findAll:  jest.fn(),
    findByPk: jest.fn(),
  },
  CompanyModule:        { findAll: jest.fn() },
  CompanyModuleRequest: { findAll: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const moduleService = require('../../pymeflowec-backend/src/services/module.service');

beforeEach(() => jest.clearAllMocks());

// ── listAll ───────────────────────────────────────────────────────────────────
describe('moduleService.listAll', () => {
  it('returns all catalog modules', async () => {
    const modules = [createMockModule(), createMockModule({ id: 2, code: 'MOD_PRODUCTS' })];
    mockModels.Module.findAll.mockResolvedValue(modules);

    const result = await moduleService.listAll();
    expect(result).toHaveLength(2);
    expect(mockModels.Module.findAll).toHaveBeenCalled();
  });
});

// ── listActive ────────────────────────────────────────────────────────────────
describe('moduleService.listActive', () => {
  it('returns active company modules with module include', async () => {
    const cm = createMockCompanyModule();
    mockModels.CompanyModule.findAll.mockResolvedValue([cm]);

    const result = await moduleService.listActive(1);
    expect(result).toHaveLength(1);
    expect(mockModels.CompanyModule.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company_id: 1, is_active: true } })
    );
  });
});

// ── getById ────────────────────────────────────────────────────────────────────
describe('moduleService.getById', () => {
  it('returns module when found', async () => {
    const mod = createMockModule();
    mockModels.Module.findByPk.mockResolvedValue(mod);

    const result = await moduleService.getById(1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if module not found', async () => {
    mockModels.Module.findByPk.mockResolvedValue(null);
    await expect(moduleService.getById(999)).rejects.toMatchObject({ status: 404 });
  });
});

// ── listPublic ────────────────────────────────────────────────────────────────
describe('moduleService.listPublic', () => {
  it('returns only active modules with limited attributes', async () => {
    const modules = [createMockModule({ is_active: true })];
    mockModels.Module.findAll.mockResolvedValue(modules);

    const result = await moduleService.listPublic();
    expect(result).toHaveLength(1);
    expect(mockModels.Module.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { is_active: true } })
    );
  });
});

// ── getCompanyCatalog ──────────────────────────────────────────────────────────
describe('moduleService.getCompanyCatalog', () => {
  it('maps active modules with APPROVED status', async () => {
    const mod = createMockModule();
    mod.toJSON = () => ({ id: 1, code: 'MOD_INVOICING', name: 'Facturación', is_active: true });
    const cm  = createMockCompanyModule({ module_id: 1, is_active: true });

    mockModels.Module.findAll.mockResolvedValue([mod]);
    mockModels.CompanyModule.findAll.mockResolvedValue([cm]);
    mockModels.CompanyModuleRequest.findAll.mockResolvedValue([]);

    const result = await moduleService.getCompanyCatalog(1);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('APPROVED');
  });

  it('maps inactive modules with PENDING status when request exists', async () => {
    const mod = createMockModule({ id: 2, code: 'MOD_PARAMS' });
    mod.toJSON = () => ({ id: 2, code: 'MOD_PARAMS', name: 'Parámetros', is_active: true });
    const req = createMockModuleRequest({ module_id: 2, status: 'PENDING' });

    mockModels.Module.findAll.mockResolvedValue([mod]);
    mockModels.CompanyModule.findAll.mockResolvedValue([]);
    mockModels.CompanyModuleRequest.findAll.mockResolvedValue([req]);

    const result = await moduleService.getCompanyCatalog(1);
    expect(result[0].status).toBe('PENDING');
  });
});
