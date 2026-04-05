'use strict';

const {
  createMockUser, createMockPlatformRole, createMockPlatformStaff,
  createMockPlatformAuditLog, mockSequelize,
} = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  PlatformStaff:    { findAll: jest.fn(), findByPk: jest.fn(), findOrCreate: jest.fn() },
  PlatformRole:     { findAll: jest.fn(), findByPk: jest.fn() },
  User:             { findByPk: jest.fn() },
  PlatformAuditLog: { create: jest.fn().mockResolvedValue(createMockPlatformAuditLog()) },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

// ── Subject under test ────────────────────────────────────────────────────────
const svc = require('../../pymeflowec-backend/src/services/platformStaff.service');

beforeEach(() => jest.clearAllMocks());

// ── list ──────────────────────────────────────────────────────────────────────
describe('platformStaffService.list', () => {
  it('retorna todo el staff con sus roles y usuarios', async () => {
    const staff = [createMockPlatformStaff()];
    mockModels.PlatformStaff.findAll.mockResolvedValue(staff);

    const result = await svc.list();

    expect(result).toHaveLength(1);
    expect(mockModels.PlatformStaff.findAll).toHaveBeenCalled();
  });
});

// ── listRoles ─────────────────────────────────────────────────────────────────
describe('platformStaffService.listRoles', () => {
  it('retorna todos los roles de plataforma ordenados por id', async () => {
    const roles = [createMockPlatformRole({ id: 1 }), createMockPlatformRole({ id: 2, code: 'support' })];
    mockModels.PlatformRole.findAll.mockResolvedValue(roles);

    const result = await svc.listRoles();

    expect(result).toHaveLength(2);
    expect(mockModels.PlatformRole.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['id', 'ASC']] })
    );
  });
});

// ── assign ────────────────────────────────────────────────────────────────────
describe('platformStaffService.assign', () => {
  it('crea nuevo registro de staff y registra auditoría', async () => {
    const user  = createMockUser();
    const role  = createMockPlatformRole();
    const staff = createMockPlatformStaff();

    mockModels.User.findByPk.mockResolvedValue(user);
    mockModels.PlatformRole.findByPk.mockResolvedValue(role);
    mockModels.PlatformStaff.findOrCreate.mockResolvedValue([staff, true]);
    staff.reload = jest.fn().mockResolvedValue(staff);

    const result = await svc.assign({ userId: 1, platformRoleId: 1, assignedBy: 2, notes: null });

    expect(result).toBe(staff);
    expect(mockModels.PlatformAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STAFF_ASSIGN' })
    );
  });

  it('actualiza el staff existente si ya tenía un registro', async () => {
    const user  = createMockUser();
    const role  = createMockPlatformRole();
    const staff = createMockPlatformStaff();

    mockModels.User.findByPk.mockResolvedValue(user);
    mockModels.PlatformRole.findByPk.mockResolvedValue(role);
    // findOrCreate devuelve created=false → debe actualizar
    mockModels.PlatformStaff.findOrCreate.mockResolvedValue([staff, false]);
    staff.reload = jest.fn().mockResolvedValue(staff);

    await svc.assign({ userId: 1, platformRoleId: 1, assignedBy: 2, notes: 'reactivado' });

    expect(staff.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true, notes: 'reactivado' })
    );
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockModels.User.findByPk.mockResolvedValue(null);
    await expect(svc.assign({ userId: 999, platformRoleId: 1, assignedBy: 2 }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('lanza 404 si el rol de plataforma no existe', async () => {
    mockModels.User.findByPk.mockResolvedValue(createMockUser());
    mockModels.PlatformRole.findByPk.mockResolvedValue(null);
    await expect(svc.assign({ userId: 1, platformRoleId: 999, assignedBy: 2 }))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── revoke ────────────────────────────────────────────────────────────────────
describe('platformStaffService.revoke', () => {
  it('desactiva el staff y registra auditoría', async () => {
    const staff = createMockPlatformStaff();
    mockModels.PlatformStaff.findByPk.mockResolvedValue(staff);

    const result = await svc.revoke(1, 2);

    expect(staff.update).toHaveBeenCalledWith({ is_active: false });
    expect(mockModels.PlatformAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STAFF_REVOKE' })
    );
    expect(result).toBe(staff);
  });

  it('lanza 404 si el registro de staff no existe', async () => {
    mockModels.PlatformStaff.findByPk.mockResolvedValue(null);
    await expect(svc.revoke(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
