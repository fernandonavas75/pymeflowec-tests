'use strict';

// Tests for /api/invoice-payments (InvoicePayment resource, requires MOD_INVOICING)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { StoreCustomer } = require('../../pymeflowec-backend/src/models');
const { cleanTestData, createProduct } = require('../setup/factories');
const closeDb = require('../setup/closeDb');

let adminToken;
let sellerToken;
let warehouseToken;
let testProduct;
let customerId;
const createdIds = { invoiceIds: [], productIds: [], invoicePaymentIds: [] };

// Helper: create an invoice and return its id
const createInvoice = async (token) => {
  await testProduct.reload();
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customer_id: customerId,
      items: [{ product_id: testProduct.id, quantity: 1, unit_price: 20.00 }],
    });
  return res.body.data;
};

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });
  const companyId = adminRes.body.user.company.id;

  const consumer = await StoreCustomer.findOne({
    where: { customer_type: 'FINAL_CONSUMER', company_id: companyId },
  });
  customerId = consumer?.id ?? null;

  testProduct = await createProduct(companyId, {
    name:  `InvPayment Test Product ${Date.now()}`,
    stock: 500,
    sale_price: 20.00,
  });
  createdIds.productIds.push(testProduct.id);
});

afterAll(async () => {
  await cleanTestData(createdIds);
  await closeDb();
});

// ── GET /api/invoice-payments ─────────────────────────────────────────────────
describe('GET /api/invoice-payments', () => {
  it('200 – admin lists payments', async () => {
    const res = await request(app)
      .get('/api/invoice-payments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list payments', async () => {
    const res = await request(app)
      .get('/api/invoice-payments')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/invoice-payments');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/invoice-payments ────────────────────────────────────────────────
describe('POST /api/invoice-payments', () => {
  let invoiceId;

  beforeAll(async () => {
    const invoice = await createInvoice(adminToken);
    invoiceId = invoice.id;
    createdIds.invoiceIds.push(invoiceId);
  });

  it('201 – admin registers payment for an invoice', async () => {
    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id:     invoiceId,
        amount:         20.00,
        payment_method: 'EFECTIVO',
        status:         'COBRADO',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.invoice_id).toBe(invoiceId);
    createdIds.invoicePaymentIds.push(res.body.data.id);
  });

  it('201 – seller can register payments', async () => {
    const invoice = await createInvoice(sellerToken);
    createdIds.invoiceIds.push(invoice.id);

    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        invoice_id:          invoice.id,
        amount:              20.00,
        payment_method:      'TRANSFERENCIA',
        transfer_reference:  'REF-TEST-001',
        status:              'COBRADO',
      });

    expect(res.status).toBe(201);
    createdIds.invoicePaymentIds.push(res.body.data.id);
  });

  it('403 – warehouse cannot register payments', async () => {
    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        invoice_id:     invoiceId,
        amount:         5.00,
        payment_method: 'EFECTIVO',
      });
    expect(res.status).toBe(403);
  });

  it('422 – missing required fields', async () => {
    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ invoice_id: invoiceId });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/invoice-payments/:id ─────────────────────────────────────────────
describe('GET /api/invoice-payments/:id', () => {
  let paymentId;
  let invoiceId;

  beforeAll(async () => {
    const invoice = await createInvoice(adminToken);
    invoiceId = invoice.id;
    createdIds.invoiceIds.push(invoiceId);

    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id:     invoiceId,
        amount:         20.00,
        payment_method: 'EFECTIVO',
        status:         'COBRADO',
      });
    paymentId = res.body.data.id;
    createdIds.invoicePaymentIds.push(paymentId);
  });

  it('200 – admin gets payment by id', async () => {
    const res = await request(app)
      .get(`/api/invoice-payments/${paymentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(paymentId);
  });

  it('404 – payment not found', async () => {
    const res = await request(app)
      .get('/api/invoice-payments/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/invoice-payments/:id/annul ─────────────────────────────────────
describe('PATCH /api/invoice-payments/:id/annul', () => {
  let paymentId;

  beforeAll(async () => {
    const invoice = await createInvoice(adminToken);
    createdIds.invoiceIds.push(invoice.id);

    const res = await request(app)
      .post('/api/invoice-payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id:     invoice.id,
        amount:         20.00,
        payment_method: 'EFECTIVO',
        status:         'COBRADO',
      });
    paymentId = res.body.data.id;
    createdIds.invoicePaymentIds.push(paymentId);
  });

  it('200 – admin annuls payment', async () => {
    const res = await request(app)
      .patch(`/api/invoice-payments/${paymentId}/annul`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ANULADO');
  });

  it('403 – seller cannot annul payments', async () => {
    const res = await request(app)
      .patch(`/api/invoice-payments/${paymentId}/annul`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});
