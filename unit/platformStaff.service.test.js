'use strict';

// Tests for taxRate.service.js (replaces old platformStaff.service)
const { createMockTaxRate, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  TaxRate: {
    findOne:         jest.fn(),
    findAndCountAll: jest.fn(),
    create:          jest.fn(),
  },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const taxRateService = require('../../pymeflowec-backend/src/services/taxRate.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('taxRateService.create', () => {
  const data = { tax_name: 'IVA 15%', percentage: 15, valid_from: '2024-01-01' };

  it('creates a tax rate', async () => {
    const taxRate = createMockTaxRate();
    mockModels.TaxRate.create.mockResolvedValue(taxRate);

    const result = await taxRateService.create(data, 1);
    expect(result).toBeDefined();
    expect(mockModels.TaxRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, tax_name: 'IVA 15%', percentage: 15 })
    );
  });
});

// ── getById ───────────────────────────────────────────────────────────────────
describe('taxRateService.getById', () => {
  it('returns tax rate when found', async () => {
    const taxRate = createMockTaxRate();
    mockModels.TaxRate.findOne.mockResolvedValue(taxRate);

    const result = await taxRateService.getById(1, 1);
    expect(result.id).toBe(1);
  });

  it('throws 404 if not found', async () => {
    mockModels.TaxRate.findOne.mockResolvedValue(null);
    await expect(taxRateService.getById(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('taxRateService.update', () => {
  it('updates tax rate fields', async () => {
    const taxRate = createMockTaxRate();
    mockModels.TaxRate.findOne.mockResolvedValue(taxRate);

    await taxRateService.update(1, { percentage: 12, is_active: false }, 1);
    expect(taxRate.update).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 12, is_active: false })
    );
  });

  it('throws 404 if tax rate not found', async () => {
    mockModels.TaxRate.findOne.mockResolvedValue(null);
    await expect(taxRateService.update(999, {}, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── list ──────────────────────────────────────────────────────────────────────
describe('taxRateService.list', () => {
  it('returns paginated tax rates for company', async () => {
    const taxRate = createMockTaxRate();
    mockModels.TaxRate.findAndCountAll.mockResolvedValue({ count: 1, rows: [taxRate] });

    const result = await taxRateService.list(1, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(mockModels.TaxRate.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company_id: 1 } })
    );
  });
});
