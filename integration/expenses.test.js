'use strict';

// Tests for /api/expenses (Expense resource, requires MOD_FINANCE)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData, createExpenseCategory } = require('../setup/factories');
const closeDb = require('../setup/closeDb');

let adminToken;
let sellerToken;
let warehouseToken;
let testCategoryId;
const createdIds = { expenseIds: [], expenseCategoryIds: [] };

// Helper to build a valid expense payload
const expensePayload = (categoryId, overrides = {}) => ({
  category_id:        categoryId,
  description:        `Egreso Test ${Date.now()}`,
  amount:             50.00,
  supplier_name_free: 'Proveedor Test',
  ...overrides,
});

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Admin@1234' });

  const category = await createExpenseCategory(adminRes.body.user.company.id, {
    name:          `Gastos Test ${Date.now()}`,
    category_type: 'OPERATIVO',
  });
  testCategoryId = category.id;
  createdIds.expenseCategoryIds.push(testCategoryId);
});

afterAll(async () => {
  await cleanTestData(createdIds);
  await closeDb();
});

// ── GET /api/expenses ─────────────────────────────────────────────────────────
describe('GET /api/expenses', () => {
  it('200 – admin gets list', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list expenses', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can list expenses', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/expenses ────────────────────────────────────────────────────────
describe('POST /api/expenses', () => {
  it('201 – admin creates expense with supplier_name_free', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expensePayload(testCategoryId, {
        description:  `Compra suministros ${Date.now()}`,
        amount:       150.00,
        expense_date: '2026-06-01',
        voucher_type: 'FACTURA',
      }));

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(Number(res.body.data.amount)).toBe(150);
    createdIds.expenseIds.push(res.body.data.id);
  });

  it('201 – admin creates expense without voucher', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expensePayload(testCategoryId, {
        description: `Gasto sin comprobante ${Date.now()}`,
        amount:      25.50,
      }));

    expect(res.status).toBe(201);
    createdIds.expenseIds.push(res.body.data.id);
  });

  it('400 – missing supplier reference', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category_id: testCategoryId,
        description: 'Sin proveedor',
        amount:      10.00,
      });
    expect(res.status).toBe(400);
  });

  it('403 – seller cannot create expenses', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(expensePayload(testCategoryId));
    expect(res.status).toBe(403);
  });

  it('422 – missing required description', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: testCategoryId, amount: 10.00 });
    expect(res.status).toBe(422);
  });

  it('422 – missing required amount', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: testCategoryId, description: 'Sin monto' });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/expenses/:id ─────────────────────────────────────────────────────
describe('GET /api/expenses/:id', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expensePayload(testCategoryId, { description: `GetById Egreso ${Date.now()}`, amount: 75.00 }));
    expenseId = res.body.data.id;
    createdIds.expenseIds.push(expenseId);
  });

  it('200 – admin gets expense by id', async () => {
    const res = await request(app)
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(expenseId);
  });

  it('200 – seller can get expense by id', async () => {
    const res = await request(app)
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('404 – expense not found', async () => {
    const res = await request(app)
      .get('/api/expenses/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/expenses/:id ─────────────────────────────────────────────────────
describe('PUT /api/expenses/:id', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expensePayload(testCategoryId, { description: `Actualizable Egreso ${Date.now()}`, amount: 100.00 }));
    expenseId = res.body.data.id;
    createdIds.expenseIds.push(expenseId);
  });

  it('200 – admin updates expense description', async () => {
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Descripción actualizada', amount: 120.00 });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.amount)).toBe(120);
  });

  it('403 – seller cannot update expenses', async () => {
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ description: 'Intento' });
    expect(res.status).toBe(403);
  });

  it('404 – expense not found', async () => {
    const res = await request(app)
      .put('/api/expenses/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'XX', amount: 1 });
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/expenses/:id/annul ─────────────────────────────────────────────
describe('PATCH /api/expenses/:id/annul', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(expensePayload(testCategoryId, { description: `Para Anular ${Date.now()}`, amount: 200.00 }));
    expenseId = res.body.data.id;
    createdIds.expenseIds.push(expenseId);
  });

  it('200 – admin annuls expense', async () => {
    const res = await request(app)
      .patch(`/api/expenses/${expenseId}/annul`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payment_status).toBe('ANULADO');
  });

  it('400 – cannot annul an already annulled expense', async () => {
    const res = await request(app)
      .patch(`/api/expenses/${expenseId}/annul`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('403 – seller cannot annul expenses', async () => {
    const res = await request(app)
      .patch(`/api/expenses/${expenseId}/annul`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('404 – expense not found', async () => {
    const res = await request(app)
      .patch('/api/expenses/999999/annul')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
