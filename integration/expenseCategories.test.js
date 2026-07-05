'use strict';

// Tests for /api/expense-categories (ExpenseCategory resource, requires MOD_FINANCE)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');
const closeDb           = require('../setup/closeDb');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { expenseCategoryIds: [] };

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
  await closeDb();
});

// ── GET /api/expense-categories ───────────────────────────────────────────────
describe('GET /api/expense-categories', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list categories', async () => {
    const res = await request(app)
      .get('/api/expense-categories')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can list categories', async () => {
    const res = await request(app)
      .get('/api/expense-categories')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/expense-categories');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/expense-categories ─────────────────────────────────────────────
describe('POST /api/expense-categories', () => {
  it('201 – admin creates expense category', async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:          `Servicios IT ${Date.now()}`,
        category_type: 'OPERATIVO',
        description:   'Gastos operativos',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.category_type).toBe('OPERATIVO');
    createdIds.expenseCategoryIds.push(res.body.data.id);
  });

  it('201 – admin creates category with type ADMINISTRATIVO', async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:          `Admin IT ${Date.now()}`,
        category_type: 'ADMINISTRATIVO',
      });

    expect(res.status).toBe(201);
    createdIds.expenseCategoryIds.push(res.body.data.id);
  });

  it('403 – seller cannot create categories', async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento', category_type: 'OPERATIVO' });
    expect(res.status).toBe(403);
  });

  it('422 – missing required name', async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_type: 'OPERATIVO' });
    expect(res.status).toBe(422);
  });

  it('422 – invalid category_type', async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', category_type: 'INVALIDO' });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/expense-categories/:id ──────────────────────────────────────────
describe('GET /api/expense-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `GetById Cat ${Date.now()}`, category_type: 'VENTAS' });
    categoryId = res.body.data.id;
    createdIds.expenseCategoryIds.push(categoryId);
  });

  it('200 – admin gets category by id', async () => {
    const res = await request(app)
      .get(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('200 – seller can get category by id', async () => {
    const res = await request(app)
      .get(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('404 – category not found', async () => {
    const res = await request(app)
      .get('/api/expense-categories/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/expense-categories/:id ──────────────────────────────────────────
describe('PUT /api/expense-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizable Cat ${Date.now()}`, category_type: 'FINANCIERO' });
    categoryId = res.body.data.id;
    createdIds.expenseCategoryIds.push(categoryId);
  });

  it('200 – admin updates category name', async () => {
    const res = await request(app)
      .put(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Actualizado ${Date.now()}` });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  it('200 – admin deactivates category', async () => {
    const res = await request(app)
      .put(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.data.is_active).toBe(false);
  });

  it('403 – seller cannot update categories', async () => {
    const res = await request(app)
      .put(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento Seller' });
    expect(res.status).toBe(403);
  });

  it('404 – category not found', async () => {
    const res = await request(app)
      .put('/api/expense-categories/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'XX' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/expense-categories/:id ───────────────────────────────────────
describe('DELETE /api/expense-categories/:id', () => {
  let categoryId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expense-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Para Eliminar Cat ${Date.now()}`, category_type: 'TRIBUTARIO' });
    categoryId = res.body.data.id;
  });

  it('200 – admin deletes category', async () => {
    const res = await request(app)
      .delete(`/api/expense-categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('403 – seller cannot delete categories', async () => {
    const res = await request(app)
      .delete('/api/expense-categories/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});
