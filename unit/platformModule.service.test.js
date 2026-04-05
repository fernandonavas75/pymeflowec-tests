'use strict';

const { createMockPlatformModule, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  PlatformModule:     { findAll: jest.fn(), findByPk: jest.fn() },
  OrganizationModule: { findAll: jest.fn() },
  Permission:         {},
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

// ── Subject under test ────────────────────────────────────────────────────────
const svc = require('../../pymeflowec-backend/src/services/platformModule.service');

beforeEach(() => jest.clearAllMocks());

// ── listAll ───────────────────────────────────────────────────────────────────
describe('platformModuleService.listAll', () => {
  it('retorna todos los módulos ordenados por sort_order', async () => {
    const modules = [
      createMockPlatformModule({ id: 1, sort_order: 1 }),
      createMockPlatformModule({ id: 2, sort_order: 2 }),
    ];
    mockModels.PlatformModule.findAll.mockResolvedValue(modules);

    const result = await svc.listAll();

    expect(result).toHaveLength(2);
    expect(mockModels.PlatformModule.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['sort_order', 'ASC']] })
    );
  });

  it('retorna arreglo vacío si no hay módulos', async () => {
    mockModels.PlatformModule.findAll.mockResolvedValue([]);
    const result = await svc.listAll();
    expect(result).toEqual([]);
  });
});

// ── listActive ────────────────────────────────────────────────────────────────
describe('platformModuleService.listActive', () => {
  it('retorna módulos activos de la organización indicada', async () => {
    const entry = { organization_id: 1, module_id: 1, is_active: true, module: createMockPlatformModule() };
    mockModels.OrganizationModule.findAll.mockResolvedValue([entry]);

    const result = await svc.listActive(1);

    expect(result).toHaveLength(1);
    expect(mockModels.OrganizationModule.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organization_id: 1, is_active: true } })
    );
  });

  it('retorna arreglo vacío si la organización no tiene módulos activos', async () => {
    mockModels.OrganizationModule.findAll.mockResolvedValue([]);
    const result = await svc.listActive(99);
    expect(result).toEqual([]);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('platformModuleService.getById', () => {
  it('retorna el módulo cuando existe', async () => {
    const mod = createMockPlatformModule({ id: 5 });
    mockModels.PlatformModule.findByPk.mockResolvedValue(mod);

    const result = await svc.getById(5);

    expect(result.id).toBe(5);
  });

  it('lanza 404 si el módulo no existe', async () => {
    mockModels.PlatformModule.findByPk.mockResolvedValue(null);
    await expect(svc.getById(999)).rejects.toMatchObject({ status: 404 });
  });
});
