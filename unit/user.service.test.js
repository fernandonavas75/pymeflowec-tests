'use strict';

const { createMockUser, createMockRole, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash:    jest.fn().mockResolvedValue('new_hashed'),
}));

const mockModels = {
  User: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  Role: { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const userService = require('../../pymeflowec-backend/src/services/user.service');
const bcrypt      = require('bcryptjs');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('userService.create', () => {
  const data = { full_name: 'New User', email: 'new@test.com', password: 'Pass@1234', role_id: 3 };

  it('creates and returns the new user', async () => {
    const newUser = createMockUser({ id: 99, email: 'new@test.com' });
    mockModels.Role.findOne.mockResolvedValue(createMockRole({ id: 3, scope: 'STORE' }));
    mockModels.User.findOne
      .mockResolvedValueOnce(null)     // email uniqueness check
      .mockResolvedValueOnce(newUser); // getById after create
    mockModels.User.create.mockResolvedValue({ id: 99 });

    const result = await userService.create(data, 1);
    expect(result.email).toBe('new@test.com');
    expect(mockModels.User.create).toHaveBeenCalled();
  });

  it('throws 404 if STORE role not found', async () => {
    mockModels.Role.findOne.mockResolvedValue(null);
    await expect(userService.create(data, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 409 if email already registered', async () => {
    mockModels.Role.findOne.mockResolvedValue(createMockRole({ scope: 'STORE' }));
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    await expect(userService.create(data, 1)).rejects.toMatchObject({ status: 409 });
  });

  it('throws 400 if no company_id can be determined', async () => {
    mockModels.Role.findOne.mockResolvedValue(createMockRole({ scope: 'STORE' }));
    await expect(userService.create(data, null)).rejects.toMatchObject({ status: 400 });
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('userService.setStatus', () => {
  it('updates user status', async () => {
    const user = createMockUser();
    mockModels.User.findOne
      .mockResolvedValueOnce(user)   // findOne for update
      .mockResolvedValueOnce(user);  // getById after update
    await userService.setStatus(1, 'INACTIVE', 1);
    expect(user.update).toHaveBeenCalledWith({ status: 'INACTIVE' });
  });

  it('throws 404 if user not found', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(userService.setStatus(999, 'INACTIVE', 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── changePassword ────────────────────────────────────────────────────────────
describe('userService.changePassword', () => {
  it('updates password when current password is correct', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await userService.changePassword(1, 'Admin@1234', 'New@1234', 1);
    expect(user.update).toHaveBeenCalledWith({ password_hash: 'new_hashed' });
  });

  it('throws 400 if current password is wrong', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(false);
    await expect(userService.changePassword(1, 'wrong', 'New@1234', 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 if user not found', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(userService.changePassword(999, 'pass', 'New@1234', 1))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('userService.remove', () => {
  it('destroys the user', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);
    await userService.remove(1, 1);
    expect(user.destroy).toHaveBeenCalled();
  });

  it('throws 404 if user not found', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(userService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
