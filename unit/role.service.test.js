'use strict';

const { createMockRole, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  Role: { findAll: jest.fn(), findByPk: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const roleService = require('../../pymeflowec-backend/src/services/role.service');

beforeEach(() => jest.clearAllMocks());

// ── list ──────────────────────────────────────────────────────────────────────
describe('roleService.list', () => {
  it('returns all roles when no scope filter', async () => {
    const roles = [createMockRole(), createMockRole({ id: 2, name: 'STORE_SELLER', scope: 'STORE' })];
    mockModels.Role.findAll.mockResolvedValue(roles);

    const result = await roleService.list();
    expect(result).toHaveLength(2);
    expect(mockModels.Role.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('filters by scope when provided', async () => {
    const roles = [createMockRole({ scope: 'PLATFORM' })];
    mockModels.Role.findAll.mockResolvedValue(roles);

    const result = await roleService.list({ scope: 'PLATFORM' });
    expect(result).toHaveLength(1);
    expect(mockModels.Role.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { scope: 'PLATFORM' } })
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('roleService.getById', () => {
  it('returns role when found', async () => {
    const role = createMockRole();
    mockModels.Role.findByPk.mockResolvedValue(role);

    const result = await roleService.getById(1);
    expect(result.id).toBe(1);
    expect(result.name).toBe('STORE_ADMIN');
  });

  it('throws 404 if role not found', async () => {
    mockModels.Role.findByPk.mockResolvedValue(null);
    await expect(roleService.getById(999)).rejects.toMatchObject({ status: 404 });
  });
});
