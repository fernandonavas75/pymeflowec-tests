'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const closeDb      = require('../setup/closeDb');

let platformAdminToken;
let adminToken;

beforeAll(async () => {
  [platformAdminToken, adminToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
  ]);
});

afterAll(async () => {
  await closeDb();
});

// ── GET /api/platform/modules/public (no auth) ────────────────────────────────
describe('GET /api/platform/modules/public', () => {
  it('200 – returns active modules without authentication', async () => {
    const res = await request(app).get('/api/platform/modules/public');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

// ── GET /api/platform/modules (requirePlatform) ───────────────────────────────
describe('GET /api/platform/modules', () => {
  it('200 – platform admin lists all catalog modules', async () => {
    const res = await request(app)
      .get('/api/platform/modules')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('403 – store admin cannot list all modules', async () => {
    const res = await request(app)
      .get('/api/platform/modules')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/platform/modules');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/modules/active ─────────────────────────────────────────
describe('GET /api/platform/modules/active', () => {
  it('200 – store admin gets active modules for their company', async () => {
    const res = await request(app)
      .get('/api/platform/modules/active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Test company has at least 3 modules activated in seed (MOD_INVOICING, MOD_PRODUCTS, MOD_FINANCE)
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/platform/modules/active');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/modules/company-catalog ────────────────────────────────
describe('GET /api/platform/modules/company-catalog', () => {
  it('200 – store admin gets catalog with status per module', async () => {
    const res = await request(app)
      .get('/api/platform/modules/company-catalog')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Each item should have a status field (APPROVED | PENDING | REJECTED | null)
    const item = res.body.data[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('code');
    expect(item).toHaveProperty('status');
  });
});

// ── GET /api/platform/modules/:id (requirePlatform) ──────────────────────────
describe('GET /api/platform/modules/:id', () => {
  it('200 – platform admin gets module by id', async () => {
    const res = await request(app)
      .get('/api/platform/modules/1')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id');
  });

  it('404 – module not found', async () => {
    const res = await request(app)
      .get('/api/platform/modules/999999')
      .set('Authorization', `Bearer ${platformAdminToken}`);
    expect(res.status).toBe(404);
  });

  it('403 – store admin cannot query by id', async () => {
    const res = await request(app)
      .get('/api/platform/modules/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});
