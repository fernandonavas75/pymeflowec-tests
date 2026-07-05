'use strict';

// Tests for /api/customers (StoreCustomer resource)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');
const closeDb           = require('../setup/closeDb');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { customerIds: [] };

// Generates a valid Ecuadorian cédula using province 17 + sequential suffix + checksum
let _docSeq = 0;
const doc = () => {
  const base = '170' + String(++_docSeq).padStart(6, '0');
  const coeff = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let p = Number.parseInt(base[i], 10) * coeff[i];
    if (p >= 10) p -= 9;
    sum += p;
  }
  return base + ((10 - (sum % 10)) % 10);
};

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

// ── GET /api/customers ────────────────────────────────────────────────────────
describe('GET /api/customers', () => {
  it('200 – admin gets paginated list', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can also list customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/customers ───────────────────────────────────────────────────────
describe('POST /api/customers', () => {
  it('201 – admin creates customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_type:   'CEDULA',
        document_number: doc(),
        full_name:       'Cliente Integration Test',
        email:           `it${Date.now()}@test.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.customer_type).toBe('CEDULA');
    createdIds.customerIds.push(res.body.data.id);
  });

  it('201 – seller can also create customers', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customer_type:   'CEDULA',
        document_number: doc(),
        full_name:       'Cliente Seller Test',
      });

    expect(res.status).toBe(201);
    createdIds.customerIds.push(res.body.data.id);
  });

  it('409 – duplicate document_number', async () => {
    const sharedDoc = doc();

    const first = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_type: 'CEDULA', document_number: sharedDoc, full_name: 'Dup 1' });
    createdIds.customerIds.push(first.body.data.id);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_type: 'CEDULA', document_number: sharedDoc, full_name: 'Dup 2' });

    expect(res.status).toBe(409);
  });
});

// ── PUT /api/customers/:id ────────────────────────────────────────────────────
describe('PUT /api/customers/:id', () => {
  let customerId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_type: 'CEDULA', document_number: doc(), full_name: 'Actualizable' });
    customerId = res.body.data.id;
    createdIds.customerIds.push(customerId);
  });

  it('200 – admin updates customer name', async () => {
    const res = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Nombre Actualizado' });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Nombre Actualizado');
  });

  it('403 – seller cannot update customers', async () => {
    const res = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ full_name: 'Intento Seller' });
    expect(res.status).toBe(403);
  });

  it('404 – customer not found', async () => {
    const res = await request(app)
      .put('/api/customers/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/customers/:id ─────────────────────────────────────────────────
describe('DELETE /api/customers/:id', () => {
  let customerId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_type: 'CEDULA', document_number: doc(), full_name: 'Para Eliminar' });
    customerId = res.body.data.id;
  });

  it('204 – admin deletes customer', async () => {
    const res = await request(app)
      .delete(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller cannot delete customers', async () => {
    const res = await request(app)
      .delete('/api/customers/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot delete customers', async () => {
    const res = await request(app)
      .delete('/api/customers/1')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});
