'use strict';

const bcrypt = require('bcryptjs');
const { User, Organization, Client, Supplier, Product, Order, OrderDetail, Invoice, InvoiceDetail, AuditLog } =
  require('../../pymeflowec-backend/src/models');

// ── Credenciales de los usuarios seed ────────────────────────────────────────
const CREDENTIALS = {
  superadmin: { email: 'superadmin@test.com', password: 'SuperAdmin2026!' },
  admin:      { email: 'admin@test.com',      password: 'Admin@1234'       },
  seller:     { email: 'seller@test.com',     password: 'Seller@1234'    },
  viewer:     { email: 'viewer@test.com',     password: 'Viewer@1234'    },
};

// ── Helpers de creación ───────────────────────────────────────────────────────
let _counter = 0;
const uid = () => ++_counter;

const createClient = async (orgId, overrides = {}) => {
  const n = uid();
  return Client.create({
    organization_id: orgId,
    full_name:       `Cliente Test ${n}`,
    identification:  `100000000${String(n).padStart(3, '0')}`,
    email:           `cliente${n}@test.com`,
    status:          'active',
    ...overrides,
  });
};

const createSupplier = async (orgId, overrides = {}) => {
  const n = uid();
  return Supplier.create({
    organization_id: orgId,
    business_name:   `Proveedor Test ${n}`,
    email:           `proveedor${n}@test.com`,
    status:          'active',
    ...overrides,
  });
};

const createProduct = async (orgId, overrides = {}) => {
  const n = uid();
  return Product.create({
    organization_id: orgId,
    name:            `Producto Test ${n}`,
    unit_price:      10.00,
    stock:           100,
    status:          'active',
    ...overrides,
  });
};

const createOrder = async (orgId, userId, clientId, productId, overrides = {}) => {
  const order = await Order.create({
    organization_id: orgId,
    client_id:       clientId,
    user_id:         userId,
    order_date:      new Date(),
    subtotal:        10.00,
    tax:             1.20,
    total:           11.20,
    status:          'pending',
    ...overrides,
  });
  await OrderDetail.create({
    order_id:   order.id,
    product_id: productId,
    quantity:   1,
    unit_price: 10.00,
    subtotal:   10.00,
  });
  return order;
};

// ── Limpieza ──────────────────────────────────────────────────────────────────
// Elimina todos los registros de prueba creados en esta sesión.
// Llama a esto en afterAll de cada test de integración.
const cleanTestData = async (ids = {}) => {
  if (ids.invoiceIds?.length)      await InvoiceDetail.destroy({ where: { invoice_id: ids.invoiceIds }, force: true });
  if (ids.invoiceIds?.length)      await Invoice.destroy({ where: { id: ids.invoiceIds }, force: true });
  if (ids.orderIds?.length)        await OrderDetail.destroy({ where: { order_id: ids.orderIds }, force: true });
  if (ids.orderIds?.length)        await Order.destroy({ where: { id: ids.orderIds }, force: true });
  if (ids.productIds?.length)      await Product.destroy({ where: { id: ids.productIds }, force: true });
  if (ids.clientIds?.length)       await Client.destroy({ where: { id: ids.clientIds }, force: true });
  if (ids.supplierIds?.length)     await Supplier.destroy({ where: { id: ids.supplierIds }, force: true });
  if (ids.userIds?.length)         await User.destroy({ where: { id: ids.userIds }, force: true });
  if (ids.organizationIds?.length) await Organization.destroy({ where: { id: ids.organizationIds }, force: true });
  if (ids.auditLogOrgId)           await AuditLog.destroy({ where: { organization_id: ids.auditLogOrgId }, force: true });
};

module.exports = {
  CREDENTIALS,
  createClient,
  createSupplier,
  createProduct,
  createOrder,
  cleanTestData,
};
