'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');

let platformAdminToken;
let adminToken;

beforeAll(async () => {
  [platformAdminToken, adminToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
  ]);
});

// ── GET /api/platform/modules ─────────────────────────────────────────────────
describe('GET /api/platform/modules', () => {
  it('200 – platform admin obtiene todos los módulos', async () => {
    const res = await request(app)
      .get('/api/platform/modules')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 – usuario de organización sin staff de plataforma no puede listar todos', async () => {
    const res = await request(app)
      .get('/api/platform/modules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/platform/modules');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/modules/active ─────────────────────────────────────────
describe('GET /api/platform/modules/active', () => {
  it('200 – usuario autenticado obtiene módulos activos de su organización', async () => {
    const res = await request(app)
      .get('/api/platform/modules/active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/platform/modules/active');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/modules/:id ────────────────────────────────────────────
describe('GET /api/platform/modules/:id', () => {
  it('200 – platform admin obtiene un módulo por id', async () => {
    const res = await request(app)
      .get('/api/platform/modules/1')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', 1);
  });

  it('404 – módulo no existente', async () => {
    const res = await request(app)
      .get('/api/platform/modules/999999')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(404);
  });

  it('403 – usuario de organización no puede consultar por id', async () => {
    const res = await request(app)
      .get('/api/platform/modules/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});
