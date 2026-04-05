'use strict';

const {
  createMockUser, createMockOrg, createMockAuditLog, mockSequelize,
  createMockPlatformStaff,
} = require('./helpers/mocks');

// ── Mocks (hoisted por Jest) ──────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash:    jest.fn().mockResolvedValue('new_hashed_password'),
}));

jest.mock('jsonwebtoken', () => ({
  sign:   jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}));

const mockModels = {
  User: {
    findOne:   jest.fn(),
    findByPk:  jest.fn(),
    create:    jest.fn(),
  },
  Role:          { findByPk: jest.fn() },
  Permission:    {},
  Organization:  { findByPk: jest.fn() },
  AuditLog:      { create: jest.fn().mockResolvedValue(createMockAuditLog()) },
  PlatformStaff: { findOne: jest.fn() },
  PlatformRole:  {},
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

// ── Subject under test ────────────────────────────────────────────────────────
const authService  = require('../../pymeflowec-backend/src/services/auth.service');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../../pymeflowec-backend/src/utils/mailer');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ── login ─────────────────────────────────────────────────────────────────────
describe('authService.login', () => {
  it('retorna tokens y datos del usuario con credenciales válidas', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login('admin@test.com', 'Admin@1234');

    // El servicio retorna access_token y refresh_token (snake_case)
    expect(result).toHaveProperty('access_token', 'mock_token');
    expect(result).toHaveProperty('refresh_token', 'mock_token');
    expect(result.user.email).toBe('admin@test.com');
    expect(result.user.platform_staff).toBeNull();
    expect(mockModels.AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN' })
    );
  });

  it('incluye platform_staff en la respuesta cuando el usuario es staff activo', async () => {
    const platformStaff = createMockPlatformStaff();
    const user          = createMockUser({ platformStaff });
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login('admin@test.com', 'Admin@1234');

    expect(result.user.platform_staff).not.toBeNull();
    expect(result.user.platform_staff.can_write).toBe(true);
    expect(result.user.platform_staff.can_read).toBe(true);
    expect(result.user.platform_staff.role).toBe('platform_admin');
  });

  it('lanza 401 si el usuario no existe', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.login('noexiste@test.com', 'pass')).rejects.toMatchObject({ status: 401 });
  });

  it('lanza 403 si el usuario está inactivo', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser({ status: 'inactive' }));
    await expect(authService.login('admin@test.com', 'pass')).rejects.toMatchObject({ status: 403 });
  });

  it('lanza 401 si la contraseña es incorrecta', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(false);
    await expect(authService.login('admin@test.com', 'wrong')).rejects.toMatchObject({ status: 401 });
  });

  it('lanza 403 si la organización está inactiva', async () => {
    const user = createMockUser({ organization: createMockOrg({ status: 'inactive' }) });
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    await expect(authService.login('admin@test.com', 'pass')).rejects.toMatchObject({ status: 403 });
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────
describe('authService.forgotPassword', () => {
  it('genera token hasheado y envía email con token crudo', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);

    await authService.forgotPassword('admin@test.com');

    // El token guardado en BD no debe ser el mismo que se envía por email
    const updateCall   = user.update.mock.calls[0][0];
    const emailCall    = sendPasswordResetEmail.mock.calls[0];
    const storedToken  = updateCall.reset_token;
    const sentToken    = emailCall[2];

    expect(storedToken).not.toBe(sentToken);
    expect(storedToken).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(sentToken).toHaveLength(64);   // randomBytes(32) hex = 64 chars
    expect(mockModels.AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESET_REQUEST' })
    );
  });

  it('no lanza error si el email no existe (seguridad)', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.forgotPassword('noexiste@test.com')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('no lanza error si el usuario está inactivo', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser({ status: 'inactive' }));
    await expect(authService.forgotPassword('admin@test.com')).resolves.toBeUndefined();
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────
describe('authService.resetPassword', () => {
  it('actualiza la contraseña y limpia el token', async () => {
    const user = createMockUser({ reset_token: 'some_hash', reset_token_expires: new Date(Date.now() + 999999) });
    mockModels.User.findOne.mockResolvedValue(user);

    await authService.resetPassword('valid_raw_token', 'NewPass@123');

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@123', 12);
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      reset_token:         null,
      reset_token_expires: null,
    }));
    expect(mockModels.AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESET_PASSWORD' })
    );
  });

  it('lanza 400 si el token es inválido o expirado', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.resetPassword('invalid_token', 'NewPass@123')).rejects.toMatchObject({ status: 400 });
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────
describe('authService.refresh', () => {
  it('retorna nuevo access_token con refresh token válido', async () => {
    const user = createMockUser();
    jwt.verify.mockReturnValue({ id: 1, organization_id: 1 });
    mockModels.User.findOne.mockResolvedValue(user);

    const result = await authService.refresh('valid_refresh_token');

    expect(result).toHaveProperty('access_token', 'mock_token');
  });

  it('lanza 401 si el refresh token es inválido', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
    await expect(authService.refresh('bad_token')).rejects.toMatchObject({ status: 401 });
  });

  it('lanza 401 si el usuario ya no está activo', async () => {
    jwt.verify.mockReturnValue({ id: 1 });
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.refresh('token')).rejects.toMatchObject({ status: 401 });
  });

  it('lanza 403 si la organización fue desactivada', async () => {
    jwt.verify.mockReturnValue({ id: 1 });
    mockModels.User.findOne.mockResolvedValue(
      createMockUser({ organization: createMockOrg({ status: 'inactive' }) })
    );
    await expect(authService.refresh('token')).rejects.toMatchObject({ status: 403 });
  });
});
