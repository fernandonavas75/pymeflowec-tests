'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');
const { CompanyModule, Module, Company } = require('../../pymeflowec-backend/src/models');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { supplierIds: [] };
let _modParamsCmId = null;

beforeAll(async () => {
  const company = await Company.findOne({ where: { ruc: '9999900000001' } });
  const mod = await Module.findOne({ where: { code: 'MOD_PARAMS' } });
  if (company && mod) {
    const [cm, created] = await CompanyModule.findOrCreate({
      where:    { company_id: company.id, module_id: mod.id },
      defaults: { is_active: true },
    });
    if (!cm.is_active) await cm.update({ is_active: true });
    if (created) _modParamsCmId = cm.id;
  }

  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
  if (_modParamsCmId) {
    await CompanyModule.destroy({ where: { id: _modParamsCmId }, force: true });
  }
});

// ── GET /api/suppliers ────────────────────────────────────────────────────────
describe('GET /api/suppliers', () => {
  it('200 – admin gets paginated list', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can also list suppliers', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('200 – warehouse can also list suppliers', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/suppliers');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/suppliers ───────────────────────────────────────────────────────
describe('POST /api/suppliers', () => {
  it('201 – admin creates supplier', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:  `Proveedor IT ${Date.now()}`,
        email: `prov${Date.now()}@test.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('name');
    createdIds.supplierIds.push(res.body.data.id);
  });

  it('403 – seller cannot create suppliers', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Test', email: 'v@test.com' });
    expect(res.status).toBe(403);
  });

  it('403 – warehouse cannot create suppliers', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: 'Test', email: 'wh@test.com' });
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
      .send({ name: `Actualizable ${Date.now()}`, email: `upd${Date.now()}@test.com` });
    supplierId = res.body.data.id;
    createdIds.supplierIds.push(supplierId);
  });

  it('200 – admin updates supplier name', async () => {
    const res = await request(app)
      .put(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nombre Nuevo S.A.' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Nombre Nuevo S.A.');
  });

  it('404 – supplier not found', async () => {
    const res = await request(app)
      .put('/api/suppliers/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('403 – seller cannot update suppliers', async () => {
    const res = await request(app)
      .put(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Intento Seller' });
    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/suppliers/:id ─────────────────────────────────────────────────
describe('DELETE /api/suppliers/:id', () => {
  let supplierId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Para Eliminar ${Date.now()}`, email: `del${Date.now()}@test.com` });
    supplierId = res.body.data.id;
  });

  it('204 – admin deletes supplier', async () => {
    const res = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller cannot delete suppliers', async () => {
    const res = await request(app)
      .delete('/api/suppliers/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});
