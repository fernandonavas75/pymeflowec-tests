'use strict';

const request = require('supertest');
const app     = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');

let adminToken;
let sellerToken;
let viewerToken;
const createdIds = { clientIds: [] };

beforeAll(async () => {
  [adminToken, sellerToken, viewerToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('viewer'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/clients ──────────────────────────────────────────────────────────
describe('GET /api/clients', () => {
  it('200 – admin obtiene lista paginada', async () => {
    const res = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/clients ─────────────────────────────────────────────────────────
describe('POST /api/clients', () => {
  it('201 – admin crea cliente correctamente', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name:      'Cliente Integration Test',
        identification: `IT${Date.now()}`,
        email:          `it${Date.now()}@test.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    createdIds.clientIds.push(res.body.data.id);
  });

  it('409 – identificación duplicada', async () => {
    const identification = `DUP${Date.now()}`;

    const first = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Dup 1', identification, email: `dup1${Date.now()}@test.com` });
    createdIds.clientIds.push(first.body.data.id);

    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Dup 2', identification, email: `dup2${Date.now()}@test.com` });

    expect(res.status).toBe(409);
  });

  it('422 – falta full_name', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ identification: '0000000001' });
    expect(res.status).toBe(422);
  });

  it('403 – viewer no puede crear clientes', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ full_name: 'Test', identification: '9999990001', email: 'v@test.com' });
    expect(res.status).toBe(403);
  });
});

// ── PUT /api/clients/:id ──────────────────────────────────────────────────────
describe('PUT /api/clients/:id', () => {
  let clientId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name:      'Actualizable',
        identification: `UPD${Date.now()}`,
        email:          `upd${Date.now()}@test.com`,
      });
    clientId = res.body.data.id;
    createdIds.clientIds.push(clientId);
  });

  it('200 – actualiza el cliente', async () => {
    const res = await request(app)
      .put(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Nombre Actualizado' });
    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Nombre Actualizado');
  });

  it('404 – cliente inexistente', async () => {
    const res = await request(app)
      .put('/api/clients/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/clients/:id ───────────────────────────────────────────────────
describe('DELETE /api/clients/:id', () => {
  let clientId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name:      'Para Eliminar',
        identification: `DEL${Date.now()}`,
        email:          `del${Date.now()}@test.com`,
      });
    clientId = res.body.data.id;
  });

  it('204 – admin elimina el cliente (soft delete)', async () => {
    const res = await request(app)
      .delete(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller no puede eliminar clientes', async () => {
    const res = await request(app)
      .delete(`/api/clients/1`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});
