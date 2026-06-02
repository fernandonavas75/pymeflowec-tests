'use strict';

// Mock factory functions for v10 schema unit tests.
// Each function returns a fresh object with new jest.fn() stubs.

const createMockRole = (overrides = {}) => ({
  id:    1,
  name:  'STORE_ADMIN',
  scope: 'STORE',
  ...overrides,
});

const createMockCompany = (overrides = {}) => ({
  id:     1,
  name:   'Test Company',
  ruc:    '9999900000001',
  status: 'ACTIVE',
  update: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id:           1,
  full_name:    'Test Admin',
  email:        'admin@test.com',
  password_hash: 'hashed_password',
  status:       'ACTIVE',
  company_id:   1,
  role_id:      1,
  role:         createMockRole(),
  company:      createMockCompany(),
  update:       jest.fn().mockResolvedValue(true),
  destroy:      jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockModule = (overrides = {}) => ({
  id:          1,
  code:        'MOD_INVOICING',
  name:        'Facturación',
  description: 'Creación de facturas',
  is_active:   true,
  toJSON:      jest.fn().mockReturnValue({ id: 1, code: 'MOD_INVOICING', name: 'Facturación', is_active: true }),
  ...overrides,
});

const createMockCompanyModule = (overrides = {}) => ({
  id:         1,
  company_id: 1,
  module_id:  1,
  is_active:  true,
  module:     createMockModule(),
  update:     jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockModuleRequest = (overrides = {}) => ({
  id:           1,
  company_id:   1,
  module_id:    1,
  requested_by: 1,
  reviewed_by:  null,
  reviewed_at:  null,
  status:       'PENDING',
  comments:     null,
  update:       jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockProductCategory = (overrides = {}) => ({
  id:          1,
  company_id:  1,
  name:        'Lácteos',
  description: 'Productos lácteos',
  status:      'ACTIVE',
  update:      jest.fn().mockResolvedValue(true),
  destroy:     jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockSupplier = (overrides = {}) => ({
  id:         1,
  company_id: 1,
  name:       'Test Supplier S.A.',
  ruc:        null,
  email:      'supplier@test.com',
  update:     jest.fn().mockResolvedValue(true),
  destroy:    jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockStoreCustomer = (overrides = {}) => ({
  id:              1,
  company_id:      1,
  customer_type:   'CEDULA',
  document_number: '1234567890',
  full_name:       'Test Customer',
  email:           'customer@test.com',
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockTaxRate = (overrides = {}) => ({
  id:         1,
  company_id: 1,
  tax_name:   'IVA 15%',
  percentage: '15.00',
  is_active:  true,
  valid_from: '2024-01-01',
  update:     jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockProduct = (overrides = {}) => ({
  id:             1,
  company_id:     1,
  category_id:    null,
  name:           'Test Product',
  purchase_price: '5.00',
  sale_price:     '10.00',
  stock:          100,
  min_stock:      5,
  status:         'ACTIVE',
  category:       null,
  supplier:       null,
  taxRate:        null,
  update:         jest.fn().mockResolvedValue(true),
  destroy:        jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockInvoice = (overrides = {}) => ({
  id:             1,
  company_id:     1,
  customer_id:    null,
  invoice_number: '001-001-000000001',
  subtotal:       '10.00',
  tax_amount:     '1.50',
  total:          '11.50',
  status:         'ISSUED',
  created_by:     1,
  update:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockInventoryMovement = (overrides = {}) => ({
  id:             1,
  company_id:     1,
  product_id:     1,
  movement_type:  'OUT',
  quantity:       1,
  reference_type: 'SALE',
  created_by:     1,
  ...overrides,
});

// Mock for sequelize.transaction that simply executes the callback
const createMockTransaction = () => ({
  LOCK: { UPDATE: 'UPDATE' },
});

const mockSequelize = {
  transaction: jest.fn().mockImplementation(async (cb) => cb(createMockTransaction())),
  authenticate: jest.fn().mockResolvedValue(true),
  query: jest.fn().mockResolvedValue([[], 0]),
};

module.exports = {
  createMockRole,
  createMockCompany,
  createMockUser,
  createMockModule,
  createMockCompanyModule,
  createMockModuleRequest,
  createMockProductCategory,
  createMockSupplier,
  createMockStoreCustomer,
  createMockTaxRate,
  createMockProduct,
  createMockInvoice,
  createMockInventoryMovement,
  createMockTransaction,
  mockSequelize,
};
