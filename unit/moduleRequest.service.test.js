'use strict';

const {
  createMockModuleRequest, createMockModule, createMockCompanyModule, mockSequelize,
} = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  CompanyModuleRequest: {
    findByPk:        jest.fn(),
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
  },
  CompanyModule: { findOrCreate: jest.fn() },
  Module:        { findByPk: jest.fn() },
  Company:       { findByPk: jest.fn() },
  User:          { findByPk: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const moduleRequestService = require('../../pymeflowec-backend/src/services/moduleRequest.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('moduleRequestService.create', () => {
  it('creates a PENDING request', async () => {
    const req = createMockModuleRequest();
    mockModels.Module.findByPk.mockResolvedValue(createMockModule());
    mockModels.CompanyModuleRequest.findOne.mockResolvedValue(null);
    mockModels.CompanyModuleRequest.create.mockResolvedValue(req);

    const result = await moduleRequestService.create({
      companyId: 1, moduleId: 1, requestedBy: 1, comments: null,
    });
    expect(result.status).toBe('PENDING');
  });

  it('throws 400 if module is inactive or not found', async () => {
    mockModels.Module.findByPk.mockResolvedValue(null);
    await expect(moduleRequestService.create({ companyId: 1, moduleId: 99, requestedBy: 1 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if module is not active', async () => {
    mockModels.Module.findByPk.mockResolvedValue(createMockModule({ is_active: false }));
    await expect(moduleRequestService.create({ companyId: 1, moduleId: 1, requestedBy: 1 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 409 if PENDING request already exists for module', async () => {
    mockModels.Module.findByPk.mockResolvedValue(createMockModule());
    mockModels.CompanyModuleRequest.findOne.mockResolvedValue(createMockModuleRequest());
    await expect(moduleRequestService.create({ companyId: 1, moduleId: 1, requestedBy: 1 }))
      .rejects.toMatchObject({ status: 409 });
  });
});

// ── approve ───────────────────────────────────────────────────────────────────
describe('moduleRequestService.approve', () => {
  it('approves request and upserts CompanyModule', async () => {
    const req = createMockModuleRequest({ status: 'PENDING' });
    const cm  = createMockCompanyModule({ is_active: true });
    mockModels.CompanyModuleRequest.findByPk.mockResolvedValue(req);
    mockModels.CompanyModule.findOrCreate.mockResolvedValue([cm, true]);

    const result = await moduleRequestService.approve(1, 99);

    expect(req.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED', reviewed_by: 99 }),
      expect.anything()
    );
  });

  it('throws 404 if request not found or not PENDING', async () => {
    mockModels.CompanyModuleRequest.findByPk.mockResolvedValue(null);
    await expect(moduleRequestService.approve(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 if request is already APPROVED', async () => {
    mockModels.CompanyModuleRequest.findByPk.mockResolvedValue(
      createMockModuleRequest({ status: 'APPROVED' })
    );
    await expect(moduleRequestService.approve(1, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── reject ────────────────────────────────────────────────────────────────────
describe('moduleRequestService.reject', () => {
  it('rejects a PENDING request', async () => {
    const req = createMockModuleRequest({ status: 'PENDING' });
    mockModels.CompanyModuleRequest.findByPk.mockResolvedValue(req);

    await moduleRequestService.reject(1, 99, 'No cumple requisitos');
    expect(req.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED', reviewed_by: 99 })
    );
  });

  it('throws 404 if request not found or not PENDING', async () => {
    mockModels.CompanyModuleRequest.findByPk.mockResolvedValue(null);
    await expect(moduleRequestService.reject(999, 1, '')).rejects.toMatchObject({ status: 404 });
  });
});
