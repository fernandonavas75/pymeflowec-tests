'use strict';

const {
  createMockPlatformModule, createMockModuleRequest, createMockPlatformStaff,
  mockSequelize,
} = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  ModuleRequest:      { findAndCountAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  PlatformModule:     { findByPk: jest.fn() },
  Organization:       {},
  User:               {},
  OrganizationModule: {},
  PlatformAuditLog:   { create: jest.fn().mockResolvedValue({}) },
  PlatformStaff:      { findOne: jest.fn() },
  PlatformRole:       {},
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

// ── Subject under test ────────────────────────────────────────────────────────
const svc = require('../../pymeflowec-backend/src/services/moduleRequest.service');

beforeEach(() => jest.clearAllMocks());

// ── list ──────────────────────────────────────────────────────────────────────
describe('moduleRequestService.list', () => {
  it('devuelve solicitudes de la organización indicada', async () => {
    const req = createMockModuleRequest();
    mockModels.ModuleRequest.findAndCountAll.mockResolvedValue({ count: 1, rows: [req] });

    const result = await svc.list({ organizationId: 1, limit: 10, offset: 0 });

    expect(result.count).toBe(1);
    expect(mockModels.ModuleRequest.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organization_id: 1 } })
    );
  });

  it('filtra por status cuando se proporciona', async () => {
    mockModels.ModuleRequest.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await svc.list({ organizationId: 1, status: 'pending', limit: 10, offset: 0 });

    expect(mockModels.ModuleRequest.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organization_id: 1, status: 'pending' } })
    );
  });
});

// ── listAll ───────────────────────────────────────────────────────────────────
describe('moduleRequestService.listAll', () => {
  it('devuelve solicitudes de todas las organizaciones', async () => {
    mockModels.ModuleRequest.findAndCountAll.mockResolvedValue({ count: 3, rows: [] });

    const result = await svc.listAll({ limit: 10, offset: 0 });

    expect(result.count).toBe(3);
    expect(mockModels.ModuleRequest.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});

// ── create ────────────────────────────────────────────────────────────────────
describe('moduleRequestService.create', () => {
  it('crea solicitud si el módulo está activo y no hay duplicado pendiente', async () => {
    const mod = createMockPlatformModule({ is_active: true });
    mockModels.PlatformModule.findByPk.mockResolvedValue(mod);
    mockModels.ModuleRequest.findOne.mockResolvedValue(null);
    const req = createMockModuleRequest();
    mockModels.ModuleRequest.create.mockResolvedValue(req);

    const result = await svc.create({ organizationId: 1, moduleId: 1, requestedBy: 2, notes: null });

    expect(result.id).toBe(1);
    expect(mockModels.ModuleRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 1, module_id: 1, requested_by: 2 })
    );
  });

  it('lanza 400 si el módulo no existe o está inactivo', async () => {
    mockModels.PlatformModule.findByPk.mockResolvedValue(null);
    await expect(svc.create({ organizationId: 1, moduleId: 99, requestedBy: 2 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('lanza 400 si el módulo existe pero está desactivado', async () => {
    mockModels.PlatformModule.findByPk.mockResolvedValue(createMockPlatformModule({ is_active: false }));
    await expect(svc.create({ organizationId: 1, moduleId: 1, requestedBy: 2 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('lanza 409 si ya existe una solicitud pendiente para ese módulo', async () => {
    mockModels.PlatformModule.findByPk.mockResolvedValue(createMockPlatformModule());
    mockModels.ModuleRequest.findOne.mockResolvedValue(createMockModuleRequest());

    await expect(svc.create({ organizationId: 1, moduleId: 1, requestedBy: 2 }))
      .rejects.toMatchObject({ status: 409 });
  });
});

// ── approve ───────────────────────────────────────────────────────────────────
describe('moduleRequestService.approve', () => {
  it('llama al procedimiento de aprobación si el staff tiene can_write', async () => {
    mockModels.PlatformStaff.findOne.mockResolvedValue(createMockPlatformStaff());
    mockSequelize.query.mockResolvedValue([[{ approve_module_request: true }]]);

    await svc.approve(1, 1);

    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('approve_module_request'),
      expect.objectContaining({ replacements: { requestId: 1, reviewerId: 1 } })
    );
  });

  it('lanza 403 si el staff no tiene can_write', async () => {
    const staffReadOnly = createMockPlatformStaff({
      platformRole: { can_read: true, can_write: false },
    });
    mockModels.PlatformStaff.findOne.mockResolvedValue(staffReadOnly);

    await expect(svc.approve(1, 1)).rejects.toMatchObject({ status: 403 });
  });

  it('lanza 403 si el reviewer no es staff activo', async () => {
    mockModels.PlatformStaff.findOne.mockResolvedValue(null);
    await expect(svc.approve(1, 99)).rejects.toMatchObject({ status: 403 });
  });
});

// ── reject ────────────────────────────────────────────────────────────────────
describe('moduleRequestService.reject', () => {
  it('llama al procedimiento de rechazo si el staff tiene can_write', async () => {
    mockModels.PlatformStaff.findOne.mockResolvedValue(createMockPlatformStaff());
    mockSequelize.query.mockResolvedValue([]);

    await svc.reject(1, 1, 'No procede');

    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('reject_module_request'),
      expect.objectContaining({ replacements: { requestId: 1, reviewerId: 1, reason: 'No procede' } })
    );
  });

  it('lanza 403 si el staff no tiene can_write', async () => {
    const staffReadOnly = createMockPlatformStaff({
      platformRole: { can_read: true, can_write: false },
    });
    mockModels.PlatformStaff.findOne.mockResolvedValue(staffReadOnly);

    await expect(svc.reject(1, 1, null)).rejects.toMatchObject({ status: 403 });
  });
});

// ── cancel ────────────────────────────────────────────────────────────────────
describe('moduleRequestService.cancel', () => {
  it('cancela la solicitud pendiente de la propia organización', async () => {
    const req = createMockModuleRequest();
    mockModels.ModuleRequest.findOne.mockResolvedValue(req);

    const result = await svc.cancel(1, 1);

    expect(req.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(result).toBe(req);
  });

  it('lanza 404 si la solicitud no existe o no está pendiente', async () => {
    mockModels.ModuleRequest.findOne.mockResolvedValue(null);
    await expect(svc.cancel(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 404 si la solicitud pertenece a otra organización', async () => {
    // findOne retorna null porque el where incluye organization_id
    mockModels.ModuleRequest.findOne.mockResolvedValue(null);
    await expect(svc.cancel(1, 99)).rejects.toMatchObject({ status: 404 });
  });
});
