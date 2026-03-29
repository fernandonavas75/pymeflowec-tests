'use strict';

const request = require('supertest');
const app     = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');

let adminToken;
let viewerToken;
const createdIds = { supplierIds: [] };

beforeAll(async () => {
  [adminToken, viewerToken] = await Promise.all([
    getToken('admin'),
    getToken('viewer'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/suppliers ────────────────────────────────────────────────────────
describe('GET /api/suppliers', () => {
  it('200 – devuelve lista paginada', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/suppliers');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/suppliers ───────────────────────────────────────────────────────
describe('POST /api/suppliers', () => {
  it('201 – admin crea proveedor', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        business_name: `Proveedor IT ${Date.now()}`,
        email:         `prov${Date.now()}@test.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    createdIds.supplierIds.push(res.body.data.id);
  });

  it('422 – falta business_name', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'sin_nombre@test.com' });
    expect(res.status).toBe(422);
  });

  it('403 – viewer no puede crear proveedores', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ business_name: 'Test', email: 'v@test.com' });
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/suppliers/:id ────────────────────────────────────────────────────
describe('PUT /api/suppliers/:id', () => {
  let supplierId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ business_name: `Actualizable ${Date.now()}`, email: `upd${Date.now()}@test.com` });
    supplierId = res.body.data.id;
    createdIds.supplierIds.push(supplierId);
  });

  it('200 – actualiza el proveedor', async () => {
    const res = await request(app)
      .put(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ business_name: 'Nombre Nuevo S.A.' });
    expect(res.status).toBe(200);
    expect(res.body.data.business_name).toBe('Nombre Nuevo S.A.');
  });

  it('404 – proveedor inexistente', async () => {
    const res = await request(app)
      .put('/api/suppliers/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ business_name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/suppliers/:id ─────────────────────────────────────────────────
describe('DELETE /api/suppliers/:id', () => {
  let supplierId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ business_name: `Para Eliminar ${Date.now()}`, email: `del${Date.now()}@test.com` });
    supplierId = res.body.data.id;
  });

  it('204 – elimina el proveedor (soft delete)', async () => {
    const res = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
