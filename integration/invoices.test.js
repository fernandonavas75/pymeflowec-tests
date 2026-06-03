'use strict';

// Tests for /api/invoices (Invoice resource, requires MOD_INVOICING + MOD_PRODUCTS)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { StoreCustomer } = require('../../pymeflowec-backend/src/models');
const { cleanTestData, createProduct } = require('../setup/factories');

let adminToken;
let sellerToken;
let warehouseToken;
let customerId;
let testProduct;
const createdIds = { invoiceIds: [], productIds: [] };

// Helper: create a fresh invoice with the test product
const makeInvoice = async (token) => {
  // Refresh product to get current stock
  await testProduct.reload();
  return request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customer_id: customerId,
      items: [{ product_id: testProduct.id, quantity: 1, unit_price: 10.00 }],
    });
};

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);

  // Get the test company's Consumidor Final customer
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });
  const user = adminRes.body.user;
  const companyId = user.company.id;

  const consumer = await StoreCustomer.findOne({
    where: { customer_type: 'FINAL_CONSUMER', company_id: companyId },
  });
  customerId = consumer?.id ?? null;

  // Create a dedicated product with enough stock for all tests
  testProduct = await createProduct(companyId, {
    name:  `Invoice Test Product ${Date.now()}`,
    stock: 500,
  });
  createdIds.productIds.push(testProduct.id);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/invoices ─────────────────────────────────────────────────────────
describe('GET /api/invoices', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list invoices', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can list invoices', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/invoices');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/invoices ────────────────────────────────────────────────────────
describe('POST /api/invoices', () => {
  it('201 – admin creates invoice', async () => {
    const res = await makeInvoice(adminToken);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('invoice_number');
    expect(parseFloat(res.body.data.total)).toBeGreaterThan(0);
    createdIds.invoiceIds.push(res.body.data.id);
  });

  it('201 – seller can also create invoices', async () => {
    const res = await makeInvoice(sellerToken);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('invoice_number');
    createdIds.invoiceIds.push(res.body.data.id);
  });

  it('403 – warehouse cannot create invoices', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        customer_id: customerId,
        items: [{ product_id: testProduct.id, quantity: 1, unit_price: 10.00 }],
      });
    expect(res.status).toBe(403);
  });

  it('400 – missing items array', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerId, items: [] });
    expect(res.status).toBe(400);
  });

  it('404 – product not found', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: customerId,
        items: [{ product_id: 999999, quantity: 1, unit_price: 10.00 }],
      });
    expect(res.status).toBe(404);
  });
});

// ── GET /api/invoices/:id ─────────────────────────────────────────────────────
describe('GET /api/invoices/:id', () => {
  let invoiceId;

  beforeAll(async () => {
    const res = await makeInvoice(adminToken);
    invoiceId = res.body.data.id;
    createdIds.invoiceIds.push(invoiceId);
  });

  it('200 – admin gets invoice by id with details', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(invoiceId);
    expect(res.body.data).toHaveProperty('details');
    expect(Array.isArray(res.body.data.details)).toBe(true);
  });

  it('200 – seller can get invoice by id', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('404 – invoice not found', async () => {
    const res = await request(app)
      .get('/api/invoices/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/invoices/:id/cancel ────────────────────────────────────────────
describe('PATCH /api/invoices/:id/cancel', () => {
  let invoiceId;

  beforeAll(async () => {
    const res = await makeInvoice(adminToken);
    invoiceId = res.body.data.id;
    createdIds.invoiceIds.push(invoiceId);
  });

  it('200 – admin cancels invoice', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('400 – cannot cancel an already cancelled invoice', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('403 – seller cannot cancel invoices', async () => {
    const another = await makeInvoice(adminToken);
    createdIds.invoiceIds.push(another.body.data.id);

    const res = await request(app)
      .patch(`/api/invoices/${another.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('404 – invoice not found', async () => {
    const res = await request(app)
      .patch('/api/invoices/999999/cancel')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
