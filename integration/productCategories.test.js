'use strict';

// Tests for /api/product-categories (ProductCategory resource, requires MOD_PRODUCTS)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { productCategoryIds: [] };

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

// ── GET /api/product-categories ───────────────────────────────────────────────
describe('GET /api/product-categories', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can also list categories', async () => {
    const res = await request(app)
      .get('/api/product-categories')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can also list categories', async () => {
    const res = await request(app)
      .get('/api/product-categories')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/product-categories');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/product-categories ─────────────────────────────────────────────
describe('POST /api/product-categories', () => {
  it('201 – admin creates category', async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Lácteos IT ${Date.now()}`, description: 'Derivados lácteos' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('name');
    createdIds.productCategoryIds.push(res.body.data.id);
  });

  it('409 – duplicate name within same company', async () => {
    const name = `Duplicado ${Date.now()}`;

    const first = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name });
    createdIds.productCategoryIds.push(first.body.data.id);

    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name });
    expect(res.status).toBe(409);
  });

  it('403 – seller cannot create categories', async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: `Intento Seller ${Date.now()}` });
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot create categories', async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: `Intento Warehouse ${Date.now()}` });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/product-categories/:id ──────────────────────────────────────────
describe('GET /api/product-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `GetById Test ${Date.now()}` });
    categoryId = res.body.data.id;
    createdIds.productCategoryIds.push(categoryId);
  });

  it('200 – admin gets category by id', async () => {
    const res = await request(app)
      .get(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('200 – seller can get category by id', async () => {
    const res = await request(app)
      .get(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('404 – category not found', async () => {
    const res = await request(app)
      .get('/api/product-categories/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/product-categories/:id ──────────────────────────────────────────
describe('PUT /api/product-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizable ${Date.now()}` });
    categoryId = res.body.data.id;
    createdIds.productCategoryIds.push(categoryId);
  });

  it('200 – admin updates category name', async () => {
    const res = await request(app)
      .put(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizada ${Date.now()}` });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('200 – admin deactivates category', async () => {
    const res = await request(app)
      .put(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('403 – seller cannot update categories', async () => {
    const res = await request(app)
      .put(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento Seller' });
    expect(res.status).toBe(403);
  });

  it('404 – category not found', async () => {
    const res = await request(app)
      .put('/api/product-categories/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'XX' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/product-categories/:id ───────────────────────────────────────
describe('DELETE /api/product-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/product-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Para Eliminar ${Date.now()}` });
    categoryId = res.body.data.id;
  });

  it('204 – admin deletes category', async () => {
    const res = await request(app)
      .delete(`/api/product-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller cannot delete categories', async () => {
    const res = await request(app)
      .delete('/api/product-categories/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot delete categories', async () => {
    const res = await request(app)
      .delete('/api/product-categories/1')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});
