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

const createMockExpenseCategory = (overrides = {}) => ({
  id:            1,
  company_id:    1,
  name:          'Operativo Test',
  category_type: 'OPERATIVO',
  description:   'Descripción test',
  is_active:     true,
  update:        jest.fn().mockResolvedValue(true),
  destroy:       jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockExpense = (overrides = {}) => ({
  id:                 1,
  company_id:         1,
  category_id:        1,
  supplier_id:        null,
  supplier_name_free: 'Proveedor Libre',
  description:        'Egreso test',
  expense_date:       '2026-01-01',
  amount:             '100.00',
  payment_status:     'PENDIENTE',
  created_by:         1,
  update:             jest.fn().mockResolvedValue(true),
  destroy:            jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockExpensePayment = (overrides = {}) => ({
  id:             1,
  company_id:     1,
  expense_id:     1,
  amount:         '50.00',
  payment_method: 'EFECTIVO',
  status:         'PAGADO',
  created_by:     1,
  update:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockExpenseBudget = (overrides = {}) => ({
  id:              1,
  company_id:      1,
  category_id:     1,
  period_type:     'MONTHLY',
  period_year:     2026,
  period_month:    1,
  budgeted_amount: '500.00',
  created_by:      1,
  update:          jest.fn().mockResolvedValue(true),
  destroy:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockInvoicePayment = (overrides = {}) => ({
  id:             1,
  company_id:     1,
  invoice_id:     1,
  amount:         '100.00',
  payment_method: 'EFECTIVO',
  status:         'COBRADO',
  created_by:     1,
  update:         jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockPettyCash = (overrides = {}) => ({
  id:              1,
  company_id:      1,
  name:            'Caja Chica',
  opening_amount:  '100.00',
  current_balance: '100.00',
  status:          'OPEN',
  opened_by:       1,
  update:          jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockPettyCashMovement = (overrides = {}) => ({
  id:            1,
  company_id:    1,
  petty_cash_id: 1,
  movement_type: 'EXPENSE',
  amount:        '20.00',
  balance_after: '80.00',
  description:   'Movimiento test',
  created_by:    1,
  ...overrides,
});

const createMockExpenseRecurring = (overrides = {}) => ({
  id:                     1,
  company_id:             1,
  category_id:            1,
  supplier_name_free:     'Proveedor Fijo',
  description:            'Egreso recurrente test',
  amount:                 '200.00',
  day_of_month:           1,
  is_active:              true,
  created_by:             1,
  update:                 jest.fn().mockResolvedValue(true),
  destroy:                jest.fn().mockResolvedValue(true),
  ...overrides,
});

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
  createMockExpenseCategory,
  createMockExpense,
  createMockExpensePayment,
  createMockExpenseBudget,
  createMockInvoicePayment,
  createMockPettyCash,
  createMockPettyCashMovement,
  createMockExpenseRecurring,
};
