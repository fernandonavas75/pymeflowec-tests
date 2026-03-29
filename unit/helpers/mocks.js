'use strict';

// Fábricas de objetos mock para unit tests.
// Cada función devuelve un objeto nuevo con jest.fn() frescos para evitar
// contaminación entre tests.

const createMockOrg = (overrides = {}) => ({
  id:       1,
  name:     'Test Org',
  ruc:      '9999999990001',
  status:   'active',
  tax_rate: 0.12,
  update:   jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockRole = (overrides = {}) => ({
  id:   2,
  name: 'admin',
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id:                  1,
  full_name:           'Test Admin',
  email:               'admin@test.com',
  password_hash:       'hashed_password',
  status:              'active',
  organization_id:     1,
  role_id:             2,
  role:                createMockRole(),
  organization:        createMockOrg(),
  reset_token:         null,
  reset_token_expires: null,
  update:              jest.fn().mockResolvedValue(true),
  destroy:             jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockClient = (overrides = {}) => ({
  id:              1,
  organization_id: 1,
  full_name:       'Test Client',
  identification:  '1234567890',
  status:          'active',
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockSupplier = (overrides = {}) => ({
  id:              1,
  organization_id: 1,
  business_name:   'Test Supplier',
  status:          'active',
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockProduct = (overrides = {}) => ({
  id:              1,
  organization_id: 1,
  name:            'Test Product',
  unit_price:      '10.00',
  stock:           100,
  status:          'active',
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockOrder = (overrides = {}) => ({
  id:              1,
  organization_id: 1,
  client_id:       1,
  user_id:         1,
  status:          'pending',
  subtotal:        10,
  tax:             1.2,
  total:           11.2,
  update:          jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockOrderDetail = (overrides = {}) => ({
  order_id:   1,
  product_id: 1,
  quantity:   1,
  unit_price: '10.00',
  subtotal:   10,
  ...overrides,
});

const createMockInvoice = (overrides = {}) => ({
  id:             1,
  organization_id: 1,
  order_id:       1,
  invoice_number: 'FAC-9999-000001',
  status:         'issued',
  subtotal:       10,
  tax:            1.2,
  total:          11.2,
  update:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockAuditLog = (overrides = {}) => ({
  id: 1,
  ...overrides,
});

// Mock de sequelize.transaction que simplemente ejecuta el callback
const createMockTransaction = () => ({
  LOCK: { UPDATE: 'UPDATE' },
});

const mockSequelize = {
  transaction: jest.fn().mockImplementation(async (cb) => cb(createMockTransaction())),
  authenticate: jest.fn().mockResolvedValue(true),
};

module.exports = {
  createMockOrg,
  createMockRole,
  createMockUser,
  createMockClient,
  createMockSupplier,
  createMockProduct,
  createMockOrder,
  createMockOrderDetail,
  createMockInvoice,
  createMockAuditLog,
  createMockTransaction,
  mockSequelize,
};
