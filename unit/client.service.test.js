'use strict';

// Tests for storeCustomer.service.js (replaces old client.service)
const { createMockStoreCustomer, mockSequelize } = require('./helpers/mocks');

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize, connectDB: jest.fn(),
}));
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

const mockModels = {
  StoreCustomer: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const customerService = require('../../pymeflowec-backend/src/services/storeCustomer.service');

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('customerService.create', () => {
  const data = {
    customer_type:   'CEDULA',
    document_number: '1234567890',
    full_name:       'Test Customer',
  };

  it('creates and returns the new customer', async () => {
    const customer = createMockStoreCustomer();
    mockModels.StoreCustomer.findOne.mockResolvedValue(null);   // no duplicate
    mockModels.StoreCustomer.create.mockResolvedValue(customer);

    const result = await customerService.create(data, 1);
    expect(result).toBeDefined();
    expect(mockModels.StoreCustomer.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 1, document_number: '1234567890' })
    );
  });

  it('throws 409 if document_number is duplicate', async () => {
    mockModels.StoreCustomer.findOne.mockResolvedValue(createMockStoreCustomer());
    await expect(customerService.create(data, 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ── update ────────────────────────────────────────────────────────────────────
describe('customerService.update', () => {
  it('updates the customer', async () => {
    const customer = createMockStoreCustomer();
    mockModels.StoreCustomer.findOne
      .mockResolvedValueOnce(customer)   // find existing
      .mockResolvedValueOnce(null);      // no duplicate doc
    await customerService.update(1, { full_name: 'Nuevo Nombre' }, 1);
    expect(customer.update).toHaveBeenCalled();
  });

  it('throws 404 if customer not found', async () => {
    mockModels.StoreCustomer.findOne.mockResolvedValue(null);
    await expect(customerService.update(999, {}, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 if trying to update FINAL_CONSUMER', async () => {
    const customer = createMockStoreCustomer({ customer_type: 'FINAL_CONSUMER' });
    mockModels.StoreCustomer.findOne.mockResolvedValue(customer);
    await expect(customerService.update(1, { full_name: 'X' }, 1)).rejects.toMatchObject({ status: 403 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('customerService.remove', () => {
  it('destroys the customer', async () => {
    const customer = createMockStoreCustomer();
    mockModels.StoreCustomer.findOne.mockResolvedValue(customer);
    await customerService.remove(1, 1);
    expect(customer.destroy).toHaveBeenCalled();
  });

  it('throws 404 if customer not found', async () => {
    mockModels.StoreCustomer.findOne.mockResolvedValue(null);
    await expect(customerService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 if trying to remove FINAL_CONSUMER', async () => {
    const customer = createMockStoreCustomer({ customer_type: 'FINAL_CONSUMER' });
    mockModels.StoreCustomer.findOne.mockResolvedValue(customer);
    await expect(customerService.remove(1, 1)).rejects.toMatchObject({ status: 403 });
  });
});
