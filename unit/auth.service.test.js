'use strict';

const { createMockUser, createMockCompany, createMockRole, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
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
    findOne:  jest.fn(),
    findByPk: jest.fn(),
    create:   jest.fn(),
  },
  Role:          { findOne: jest.fn() },
  Company:       { findOne: jest.fn(), create: jest.fn() },
  StoreCustomer: { create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

// ── Subject under test ────────────────────────────────────────────────────────
const authService = require('../../pymeflowec-backend/src/services/auth.service');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');

beforeEach(() => jest.clearAllMocks());

// ── login ─────────────────────────────────────────────────────────────────────
describe('authService.login', () => {
  it('returns tokens and user payload on valid credentials', async () => {
    const user = createMockUser();
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login('admin@test.com', 'Admin@1234');

    expect(result).toHaveProperty('access_token', 'mock_token');
    expect(result).toHaveProperty('refresh_token', 'mock_token');
    expect(result.user.email).toBe('admin@test.com');
    expect(result.user).toHaveProperty('role');
    expect(result.user).toHaveProperty('company');
  });

  it('throws 401 if user not found', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.login('noexiste@test.com', 'pass'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 403 if user is not ACTIVE', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser({ status: 'INACTIVE' }));
    await expect(authService.login('admin@test.com', 'pass'))
      .rejects.toMatchObject({ status: 403 });
  });

  it('throws 403 if company is not ACTIVE', async () => {
    const user = createMockUser({ company: createMockCompany({ status: 'SUSPENDED' }) });
    mockModels.User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    await expect(authService.login('admin@test.com', 'pass'))
      .rejects.toMatchObject({ status: 403 });
  });

  it('throws 401 if password is wrong', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(false);
    await expect(authService.login('admin@test.com', 'wrong'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('platform user (null company_id) succeeds without company check', async () => {
    const platformUser = createMockUser({
      company_id: null,
      company:    null,
      role:       createMockRole({ name: 'PLATFORM_ADMIN', scope: 'PLATFORM' }),
    });
    mockModels.User.findOne.mockResolvedValue(platformUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login('platform_admin@test.com', 'PlatformAdmin2026!');
    expect(result.user.company).toBeNull();
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────
describe('authService.refresh', () => {
  it('returns new access_token with valid refresh token', async () => {
    const user = createMockUser();
    jwt.verify.mockReturnValue({ id: 1, company_id: 1 });
    mockModels.User.findOne.mockResolvedValue(user);

    const result = await authService.refresh('valid_refresh_token');
    expect(result).toHaveProperty('access_token', 'mock_token');
    expect(result).not.toHaveProperty('refresh_token');
  });

  it('throws 401 if refresh token is invalid', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
    await expect(authService.refresh('bad_token'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 if user is no longer active', async () => {
    jwt.verify.mockReturnValue({ id: 1 });
    mockModels.User.findOne.mockResolvedValue(null);
    await expect(authService.refresh('token'))
      .rejects.toMatchObject({ status: 401 });
  });

  it('throws 403 if company was deactivated', async () => {
    jwt.verify.mockReturnValue({ id: 1, company_id: 1 });
    mockModels.User.findOne.mockResolvedValue(
      createMockUser({ company: createMockCompany({ status: 'INACTIVE' }) })
    );
    await expect(authService.refresh('token'))
      .rejects.toMatchObject({ status: 403 });
  });
});

// ── register ──────────────────────────────────────────────────────────────────
describe('authService.register', () => {
  const validData = {
    company_name: 'Test Co',
    full_name:    'Owner Test',
    email:        'owner@test.com',
    password:     'Password@123',
  };

  it('creates company, StoreCustomer and user, then returns tokens', async () => {
    const newUser    = createMockUser({ id: 99, email: 'owner@test.com' });
    const newCompany = createMockCompany({ id: 99 });

    mockModels.User.findOne
      .mockResolvedValueOnce(null)   // email check → not exists
      .mockResolvedValueOnce(newUser); // loadUser after create
    mockModels.Company.findOne.mockResolvedValue(null);
    mockModels.Role.findOne.mockResolvedValue(createMockRole({ name: 'STORE_ADMIN', scope: 'STORE' }));
    mockModels.Company.create.mockResolvedValue(newCompany);
    mockModels.StoreCustomer.create.mockResolvedValue({});
    mockModels.User.create.mockResolvedValue({ id: 99 });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.register(validData);

    expect(result).toHaveProperty('access_token', 'mock_token');
    expect(mockModels.Company.create).toHaveBeenCalled();
    expect(mockModels.StoreCustomer.create).toHaveBeenCalled();
    expect(mockModels.User.create).toHaveBeenCalled();
  });

  it('throws 409 if email already registered', async () => {
    mockModels.User.findOne.mockResolvedValue(createMockUser());
    await expect(authService.register(validData))
      .rejects.toMatchObject({ status: 409 });
  });

  it('throws 500 if STORE_ADMIN role is missing', async () => {
    mockModels.User.findOne.mockResolvedValue(null);
    mockModels.Company.findOne.mockResolvedValue(null);
    mockModels.Role.findOne.mockResolvedValue(null);
    await expect(authService.register(validData))
      .rejects.toMatchObject({ status: 500 });
  });
});

// ── changePassword ────────────────────────────────────────────────────────────
describe('authService.changePassword', () => {
  it('updates password when current password is correct', async () => {
    const user = createMockUser();
    mockModels.User.findByPk.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await authService.changePassword(1, 'Admin@1234', 'NewPass@1234');

    expect(user.update).toHaveBeenCalledWith({ password_hash: 'new_hashed_password' });
  });

  it('throws 400 if current password is wrong', async () => {
    mockModels.User.findByPk.mockResolvedValue(createMockUser());
    bcrypt.compare.mockResolvedValue(false);
    await expect(authService.changePassword(1, 'wrong', 'NewPass@1234'))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 if user not found', async () => {
    mockModels.User.findByPk.mockResolvedValue(null);
    await expect(authService.changePassword(999, 'pass', 'NewPass@1234'))
      .rejects.toMatchObject({ status: 404 });
  });
});
