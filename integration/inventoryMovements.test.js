'use strict';

// Tests for /api/inventory-movements (InventoryMovement resource, requires MOD_PRODUCTS)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData, createProduct } = require('../setup/factories');

let adminToken;
let sellerToken;
let warehouseToken;
let testProduct;
const createdIds = { productIds: [] };

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });

  testProduct = await createProduct(adminRes.body.user.company.id, {
    name:  `InvMovement Test Product ${Date.now()}`,
    stock: 200,
    sale_price: 15.00,
  });
  createdIds.productIds.push(testProduct.id);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/inventory-movements ─────────────────────────────────────────────
describe('GET /api/inventory-movements', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list movements', async () => {
    const res = await request(app)
      .get('/api/inventory-movements')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can list movements', async () => {
    const res = await request(app)
      .get('/api/inventory-movements')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – can filter by product_id', async () => {
    const res = await request(app)
      .get(`/api/inventory-movements?product_id=${testProduct.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/inventory-movements');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/inventory-movements ────────────────────────────────────────────
describe('POST /api/inventory-movements', () => {
  it('201 – admin registers IN movement', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id:     testProduct.id,
        movement_type:  'IN',
        quantity:       10,
        reference_type: 'PURCHASE',
        notes:          'Compra de prueba',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.movement_type).toBe('IN');
    expect(res.body.data.quantity).toBe(10);
  });

  it('201 – warehouse registers OUT movement', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_id:    testProduct.id,
        movement_type: 'OUT',
        quantity:      5,
        notes:         'Salida manual',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.movement_type).toBe('OUT');
  });

  it('201 – admin registers ADJUSTMENT movement', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id:    testProduct.id,
        movement_type: 'ADJUSTMENT',
        quantity:      100,
        notes:         'Ajuste de inventario físico',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.movement_type).toBe('ADJUSTMENT');
  });

  it('403 – seller cannot register movements', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        product_id:    testProduct.id,
        movement_type: 'IN',
        quantity:      1,
      });
    expect(res.status).toBe(403);
  });

  it('422 – missing required product_id', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movement_type: 'IN', quantity: 5 });
    expect(res.status).toBe(422);
  });

  it('422 – invalid movement_type', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_id: testProduct.id, movement_type: 'INVALIDO', quantity: 5 });
    expect(res.status).toBe(422);
  });

  it('422 – missing quantity', async () => {
    const res = await request(app)
      .post('/api/inventory-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_id: testProduct.id, movement_type: 'IN' });
    expect(res.status).toBe(422);
  });
});
