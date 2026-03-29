'use strict';

const { createMockClient, mockSequelize } = require('./helpers/mocks');

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../pymeflowec-backend/src/utils/logger', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../pymeflowec-backend/src/config/database', () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn(),
}));

const mockModels = {
  Client: { findOne: jest.fn(), findAndCountAll: jest.fn(), create: jest.fn() },
};
jest.mock('../../pymeflowec-backend/src/models', () => mockModels);

const clientService = require('../../pymeflowec-backend/src/services/client.service');

// ── Helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────
describe('clientService.create', () => {
  const validData = {
    full_name:      'Juan Perez',
    identification: '1234567890',
    email:          'juan@test.com',
  };

  it('crea cliente correctamente', async () => {
    const client = createMockClient();
    mockModels.Client.findOne.mockResolvedValue(null); // identificación libre
    mockModels.Client.create.mockResolvedValue(client);

    const result = await clientService.create(validData, 1);
    expect(result).toBeDefined();
    expect(mockModels.Client.create).toHaveBeenCalledWith(
      expect.objectContaining({ identification: '1234567890', organization_id: 1 })
    );
  });

  it('lanza 409 si ya existe un cliente con esa identificación', async () => {
    mockModels.Client.findOne.mockResolvedValue(createMockClient());
    await expect(clientService.create(validData, 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ── update ─────────────────────────────────────────────────────────────────────
describe('clientService.update', () => {
  it('actualiza el cliente correctamente', async () => {
    const client = createMockClient();
    mockModels.Client.findOne.mockResolvedValue(client);

    await clientService.update(1, { full_name: 'Nuevo Nombre' }, 1);
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Nuevo Nombre' })
    );
  });

  it('lanza 409 si la nueva identificación ya está en uso', async () => {
    const client = createMockClient({ identification: '0000000000' });
    mockModels.Client.findOne
      .mockResolvedValueOnce(client)          // find cliente a modificar
      .mockResolvedValueOnce(createMockClient()); // identificación duplicada
    await expect(
      clientService.update(1, { identification: '1234567890' }, 1)
    ).rejects.toMatchObject({ status: 409 });
  });

  it('lanza 404 si el cliente no existe', async () => {
    mockModels.Client.findOne.mockResolvedValue(null);
    await expect(clientService.update(999, {}, 1)).rejects.toMatchObject({ status: 404 });
  });
});

// ── remove ────────────────────────────────────────────────────────────────────
describe('clientService.remove', () => {
  it('elimina (soft delete) el cliente', async () => {
    const client = createMockClient();
    mockModels.Client.findOne.mockResolvedValue(client);

    await clientService.remove(1, 1);
    expect(client.destroy).toHaveBeenCalled();
  });

  it('lanza 404 si el cliente no existe', async () => {
    mockModels.Client.findOne.mockResolvedValue(null);
    await expect(clientService.remove(999, 1)).rejects.toMatchObject({ status: 404 });
  });
});
