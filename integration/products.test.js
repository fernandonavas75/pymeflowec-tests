'use strict';

// Tests for /api/products (Product resource, requires MOD_PRODUCTS)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { productIds: [] };

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/products ─────────────────────────────────────────────────────────
describe('GET /api/products', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can list products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/products ────────────────────────────────────────────────────────
describe('POST /api/products', () => {
  it('201 – admin creates product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:           `Producto IT ${Date.now()}`,
        sale_price:     10.00,
        purchase_price: 5.00,
        stock:          50,
        min_stock:      5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('name');
    createdIds.productIds.push(res.body.data.id);
  });

  it('403 – seller cannot create products', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento Seller', sale_price: 5.00 });
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot create products', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: 'Intento Warehouse', sale_price: 5.00 });
    expect(res.status).toBe(403);
  });

  it('401 – no token', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Sin Token', sale_price: 5.00 });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
describe('GET /api/products/:id', () => {
  let productId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `GetById Test ${Date.now()}`, sale_price: 8.00 });
    productId = res.body.data.id;
    createdIds.productIds.push(productId);
  });

  it('200 – admin gets product by id', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(productId);
  });

  it('200 – seller can get product by id', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can get product by id', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('404 – product not found', async () => {
    const res = await request(app)
      .get('/api/products/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
describe('PUT /api/products/:id', () => {
  let productId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizable ${Date.now()}`, sale_price: 10.00, purchase_price: 5.00 });
    productId = res.body.data.id;
    createdIds.productIds.push(productId);
  });

  it('200 – admin updates product name and price', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizado ${Date.now()}`, sale_price: 15.00 });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(productId);
  });

  it('403 – seller cannot update products', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento Seller' });
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot update products', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: 'Intento Warehouse' });
    expect(res.status).toBe(403);
  });

  it('404 – product not found', async () => {
    const res = await request(app)
      .put('/api/products/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'XX', sale_price: 1 });
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/products/:id/stock ─────────────────────────────────────────────
describe('PATCH /api/products/:id/stock', () => {
  let productId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Stock Test ${Date.now()}`, sale_price: 10.00, stock: 100 });
    productId = res.body.data.id;
    createdIds.productIds.push(productId);
  });

  it('200 – admin adjusts stock with IN', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10, movement_type: 'IN', notes: 'Test entrada' });
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can adjust stock with OUT', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ quantity: 5, movement_type: 'OUT', notes: 'Test salida' });
    expect(res.status).toBe(200);
  });

  it('200 – admin adjusts stock with ADJUSTMENT', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 80, movement_type: 'ADJUSTMENT', notes: 'Ajuste inventario' });
    expect(res.status).toBe(200);
  });

  it('403 – seller cannot adjust stock', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ quantity: 5, type: 'ENTRADA' });
    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/products/:id/activate and /deactivate ─────────────────────────
describe('PATCH /api/products/:id/activate and deactivate', () => {
  let productId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `ToggleStatus ${Date.now()}`, sale_price: 10.00 });
    productId = res.body.data.id;
    createdIds.productIds.push(productId);
  });

  it('200 – admin deactivates product', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('200 – admin activates product', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('403 – seller cannot deactivate product', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/deactivate`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot activate product', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/activate`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/products/bulk ───────────────────────────────────────────────────
describe('POST /api/products/bulk', () => {
  it('200 – admin bulk creates products and reports created_count', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/products/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        products: [
          { name: `Bulk A ${ts}`, unit_price: 5.00, cost_price: 2.00 },
          { name: `Bulk B ${ts}`, unit_price: 7.50, cost_price: 3.00 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('created_count');
    expect(res.body.created_count).toBe(2);
    expect(res.body.failed_count).toBe(0);
  });

  it('403 – seller cannot bulk create', async () => {
    const res = await request(app)
      .post('/api/products/bulk')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ products: [{ name: 'Bulk Seller', sale_price: 5 }] });
    expect(res.status).toBe(403);
  });

  it('422 – missing products array', async () => {
    const res = await request(app)
      .post('/api/products/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
describe('DELETE /api/products/:id', () => {
  let productId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Para Eliminar ${Date.now()}`, sale_price: 10.00 });
    productId = res.body.data.id;
  });

  it('204 – admin deletes product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller cannot delete products', async () => {
    const res = await request(app)
      .delete('/api/products/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot delete products', async () => {
    const res = await request(app)
      .delete('/api/products/1')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});
