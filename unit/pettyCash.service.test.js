'use strict';

const {
  createMockPettyCash, createMockPettyCashMovement, createMockExpenseCategory, mockSequelize,
} = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  PettyCash:         { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
  PettyCashMovement: { findAndCountAll: jest.fn(), create: jest.fn() },
  ExpenseCategory:   { findOne: jest.fn() },
  User:              { findOne: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const pettyCashService = require('../../pymeflowec-backend/src/services/pettyCash.service');

beforeEach(() => jest.clearAllMocks());

// ── open ──────────────────────────────────────────────────────────────────────
describe('pettyCashService.open', () => {
  it('throws 409 if a session is already open', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(createMockPettyCash());
    await expect(pettyCashService.open({ opening_amount: 100 }, 1, 1))
      .rejects.toMatchObject({ status: 409 });
  });

  it('creates a new petty cash session', async () => {
    const pc = createMockPettyCash();
    mockModels.PettyCash.findOne.mockResolvedValue(null);
    mockModels.PettyCash.create.mockResolvedValue(pc);

    const result = await pettyCashService.open({ opening_amount: 100, name: 'Caja 1' }, 1, 1);
    expect(result).toBeDefined();
    expect(mockModels.PettyCash.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, opening_amount: 100, status: 'OPEN', opened_by: 1 })
    );
  });
});

// ── close ─────────────────────────────────────────────────────────────────────
describe('pettyCashService.close', () => {
  it('throws 404 if session not found', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(null);
    await expect(pettyCashService.close(999, {}, 1, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if session is already closed', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(createMockPettyCash({ status: 'CLOSED' }));
    await expect(pettyCashService.close(1, {}, 1, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('closes an open session', async () => {
    const pc = createMockPettyCash();
    mockModels.PettyCash.findOne.mockResolvedValue(pc);

    await pettyCashService.close(1, { closing_amount_reported: 80 }, 1, 1);
    expect(pc.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CLOSED', closing_amount_reported: 80 }),
      expect.anything()
    );
  });
});

// ── getOpenSession ─────────────────────────────────────────────────────────────
describe('pettyCashService.getOpenSession', () => {
  it('returns open session when it exists', async () => {
    const pc = createMockPettyCash();
    mockModels.PettyCash.findOne.mockResolvedValue(pc);
    const result = await pettyCashService.getOpenSession(1);
    expect(result.status).toBe('OPEN');
  });

  it('throws 404 if no open session exists', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(null);
    await expect(pettyCashService.getOpenSession(1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── addMovement ───────────────────────────────────────────────────────────────
describe('pettyCashService.addMovement', () => {
  const expenseData = { movement_type: 'EXPENSE', amount: 20, description: 'Compra' };
  const incomeData  = { movement_type: 'INCOME',  amount: 50, description: 'Reposición' };

  it('throws 404 if session not found', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(null);
    await expect(pettyCashService.addMovement(999, expenseData, 1, 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 if session is closed', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(createMockPettyCash({ status: 'CLOSED' }));
    await expect(pettyCashService.addMovement(1, expenseData, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 if EXPENSE amount exceeds balance', async () => {
    mockModels.PettyCash.findOne.mockResolvedValue(createMockPettyCash({ current_balance: '10.00' }));
    await expect(pettyCashService.addMovement(1, { ...expenseData, amount: 50 }, 1, 1))
      .rejects.toMatchObject({ status: 400 });
  });

  it('deducts balance on EXPENSE movement', async () => {
    const pc       = createMockPettyCash({ current_balance: '100.00' });
    const movement = createMockPettyCashMovement({ balance_after: 80 });
    mockModels.PettyCash.findOne.mockResolvedValue(pc);
    mockModels.PettyCashMovement.create.mockResolvedValue(movement);

    const result = await pettyCashService.addMovement(1, expenseData, 1, 1);
    expect(result).toBeDefined();
    expect(pc.update).toHaveBeenCalledWith({ current_balance: 80 }, expect.anything());
  });

  it('increases balance on INCOME movement', async () => {
    const pc       = createMockPettyCash({ current_balance: '100.00' });
    const movement = createMockPettyCashMovement({ movement_type: 'INCOME', balance_after: 150 });
    mockModels.PettyCash.findOne.mockResolvedValue(pc);
    mockModels.PettyCashMovement.create.mockResolvedValue(movement);

    await pettyCashService.addMovement(1, incomeData, 1, 1);
    expect(pc.update).toHaveBeenCalledWith({ current_balance: 150 }, expect.anything());
  });
});
