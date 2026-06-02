'use strict';

const {
  User, Company, StoreCustomer, Supplier, Product, ProductCategory, TaxRate,
  Invoice, InvoiceDetail, CompanyModuleRequest, CompanyModule,
} = require('../../pymeflowec-backend/src/models');

// ── Credentials for seed users ────────────────────────────────────────────────
const CREDENTIALS = {
  platform_admin:   { email: 'platform_admin@test.com',   password: 'PlatformAdmin2026!' },
  platform_support: { email: 'platform_support@test.com', password: 'PlatformSupport2026!' },
  admin:            { email: 'admin@test.com',             password: 'Admin@1234' },
  seller:           { email: 'seller@test.com',            password: 'Seller@1234' },
  warehouse:        { email: 'warehouse@test.com',         password: 'Warehouse@1234' },
};

// ── Factory helpers ───────────────────────────────────────────────────────────
let _counter = 0;
const uid = () => ++_counter;

// document_number for CEDULA must be exactly 10 digits
const docNum = (n) => String(1000000000 + n).slice(-10);

const createCustomer = async (companyId, overrides = {}) => {
  const n = uid();
  return StoreCustomer.create({
    company_id:      companyId,
    customer_type:   'CEDULA',
    document_number: docNum(n),
    full_name:       `Cliente Test ${n}`,
    email:           `cliente${n}@test.com`,
    ...overrides,
  });
};

const createSupplier = async (companyId, overrides = {}) => {
  const n = uid();
  return Supplier.create({
    company_id: companyId,
    name:       `Proveedor Test ${n}`,
    email:      `proveedor${n}@test.com`,
    ...overrides,
  });
};

const createTaxRate = async (companyId, overrides = {}) => {
  const n = uid();
  return TaxRate.create({
    company_id: companyId,
    tax_name:   `IVA Test ${n}`,
    percentage: 12.00,
    valid_from: '2024-01-01',
    ...overrides,
  });
};

const createProductCategory = async (companyId, overrides = {}) => {
  const n = uid();
  return ProductCategory.create({
    company_id:  companyId,
    name:        `Categoría Test ${n}`,
    description: `Descripción categoría ${n}`,
    status:      'ACTIVE',
    ...overrides,
  });
};

const createProduct = async (companyId, overrides = {}) => {
  const n = uid();
  return Product.create({
    company_id:     companyId,
    name:           `Producto Test ${n}`,
    purchase_price: 5.00,
    sale_price:     10.00,
    stock:          100,
    min_stock:      5,
    status:         'ACTIVE',
    ...overrides,
  });
};

const createModuleRequest = async (companyId, moduleId, requestedBy, overrides = {}) => {
  return CompanyModuleRequest.create({
    company_id:   companyId,
    module_id:    moduleId,
    requested_by: requestedBy,
    status:       'PENDING',
    ...overrides,
  });
};

// ── Cleanup ───────────────────────────────────────────────────────────────────
const cleanTestData = async (ids = {}) => {
  if (ids.moduleRequestIds?.length) {
    await CompanyModuleRequest.destroy({ where: { id: ids.moduleRequestIds }, force: true });
  }
  if (ids.companyModuleIds?.length) {
    await CompanyModule.destroy({ where: { id: ids.companyModuleIds }, force: true });
  }
  if (ids.invoiceIds?.length) {
    await InvoiceDetail.destroy({ where: { invoice_id: ids.invoiceIds }, force: true });
    await Invoice.destroy({ where: { id: ids.invoiceIds }, force: true });
  }
  if (ids.productIds?.length) {
    await Product.destroy({ where: { id: ids.productIds }, force: true });
  }
  if (ids.productCategoryIds?.length) {
    await ProductCategory.destroy({ where: { id: ids.productCategoryIds }, force: true });
  }
  if (ids.customerIds?.length) {
    await StoreCustomer.destroy({ where: { id: ids.customerIds }, force: true });
  }
  if (ids.supplierIds?.length) {
    await Supplier.destroy({ where: { id: ids.supplierIds }, force: true });
  }
  if (ids.taxRateIds?.length) {
    await TaxRate.destroy({ where: { id: ids.taxRateIds }, force: true });
  }
  if (ids.userIds?.length) {
    await User.destroy({ where: { id: ids.userIds }, force: true });
  }
  if (ids.companyIds?.length) {
    await Company.destroy({ where: { id: ids.companyIds }, force: true });
  }
};

module.exports = {
  CREDENTIALS,
  createCustomer,
  createSupplier,
  createTaxRate,
  createProductCategory,
  createProduct,
  createModuleRequest,
  cleanTestData,
};
