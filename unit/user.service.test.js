'use strict';

const { createMockUser, createMockRole, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash:    jest.fn().mockResolvedValue('new_hashed_password'),
}));

const mockModels = {
  User:         { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
  Role:         { findByPk: jest.fn() },
  Organization: { findByPk: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const userService = require('../../pymeflowec-backend/src/services/user.service');
const bcrypt      = require('bcryptjs');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('userService.create', () => {
  const validData = { full_name: 'Nuevo Usuario', email: 'nuevo@test.com', password: 'Pass@1234', role_id: 2 };

  it('crea usuario correctamente', async () => {
    const role = createMockRole({ name: 'seller' });
    const user = createMockUser({ id: 5 });

    mockModels.Role.findByPk.mockResolvedValue(role);
    mockModels.User.findOne
      .mockResolvedValueOnce(null)  // email no existe
      .mockResolvedValueOnce(user); // getById al final
    mockModels.User.create.mockResolvedValue(user);

    const result = await userService.create(validData, 1);
    expect(result).toBeDefined();
    expect(bcrypt.hash).toHaveBeenCalledWith('Pass@1234', 12);
    expect(mockModels.User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@test.com' })
    );
  });

  it('lanza 404 si el rol no existe', async () => {
    mockModels.Role.findByPk.mockResolvedValue(null);
    await expect(userService.create(validData, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('lanza 403 si se intenta asignar rol superadmin', async () => {
    mockModels.Role.findByPk.mockResolvedValue(createMockRole({ name: 'superadmin' }));
    await expect(userService.create(validData, 1)).rejects.toMatchObject({ status: 403 });
  });

  it('lanza 409 si el email ya está registrado', async () => {
    mockModels.Role.findByPk.mockResolvedValue(createMockRole({ name: 'seller' }));
    mockModels.User.findOne.mockResolvedValue(createMockUser()); // email ya existe
    await expect(userService.create(validData, 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ── changePassword ─────────────────────────────────────────────────────────────
describe('userService.changePassword', () => {
  it('cambia la contraseña con credenciales válidas', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await userService.changePassword(1, 'OldPass@123', 'NewPass@123', 1);

    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@123', 12);
    expect(user.update).toHaveBeenCalledWith({ password_hash: 'new_hashed_password' });
  });

  it('lanza 400 si la contraseña actual es incorrecta', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(false);
    await expect(userService.changePassword(1, 'WrongPass', 'NewPass@123', 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(userService.changePassword(999, 'pass', 'newpass', 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('lanza 400 si la nueva contraseña tiene menos de 8 caracteres', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(true);
    await expect(userService.changePassword(1, 'OldPass@123', 'short', 1))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('userService.setStatus', () => {
  it('actualiza el estado del usuario', async () => {
    const user = createMockUser();
    mockModels.User.findOne
      .mockResolvedValueOnce(user)   // findOne para encontrar el user
      .mockResolvedValueOnce(user);  // getById al final

    await userService.setStatus(1, 'inactive', 1);
    expect(user.update).toHaveBeenCalledWith({ status: 'inactive' });
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(userService.setStatus(999, 'inactive', 1)).rejects.toMatchObject({ status: 404 });
  });
});
