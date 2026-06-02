'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');
const { Op }       = require('../../pymeflowec-backend/node_modules/sequelize');
const { Module, CompanyModule, CompanyModuleRequest, Company } = require('../../pymeflowec-backend/src/models');

let platformAdminToken;
let adminToken;
let sellerToken;
const createdIds = { moduleRequestIds: [] };

// Module NOT active for the test company — resolved in beforeAll
let MODULE_ID;
let TEST_COMPANY_ID;

// Populated dynamically in beforeAll from the company's currently-active modules
let SEED_MODULE_IDS = [];

beforeAll(async () => {
  // Find the test company
  const company = await Company.findOne({ where: { ruc: '9999900000001' } });
  if (!company) throw new Error('Test company not found. Run npm run seed first.');
  TEST_COMPANY_ID = company.id;

  // Load the seeded module IDs (those the seed activated: MOD_INVOICING, MOD_PRODUCTS, MOD_FINANCE)
  const activeCMs = await CompanyModule.findAll({
    where: { company_id: TEST_COMPANY_ID, is_active: true },
  });
  SEED_MODULE_IDS = activeCMs.map(cm => Number(cm.module_id));

  // Remove stale company_modules added by previous test runs (anything beyond seed modules)
  if (SEED_MODULE_IDS.length) {
    await CompanyModule.destroy({
      where: {
        company_id: TEST_COMPANY_ID,
        module_id:  { [Op.notIn]: SEED_MODULE_IDS },
      },
      force: true,
    });
  }

  // Remove any stale module requests left from previous runs
  await CompanyModuleRequest.destroy({
    where: { company_id: TEST_COMPANY_ID },
    force: true,
  });

  // Find a catalog module that is NOT activated for this company (MOD_PARAMS after seed)
  const mod = await Module.findOne({
    where: {
      is_active: true,
      id: { [Op.notIn]: SEED_MODULE_IDS },
    },
  });
  if (!mod) throw new Error('No inactive module found for test company. Check seeds_tesis_v10.sql.');
  MODULE_ID = mod.id;

  [platformAdminToken, adminToken, sellerToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
    getToken('seller'),
  ]);
});

afterAll(async () => {
  // Clean module requests created during tests
  await cleanTestData(createdIds);
  // Clean any company_modules added by the approve test
  if (TEST_COMPANY_ID && MODULE_ID) {
    await CompanyModule.destroy({
      where: { company_id: TEST_COMPANY_ID, module_id: MODULE_ID },
      force: true,
    });
  }
});

// ── GET /api/module-requests ──────────────────────────────────────────────────
describe('GET /api/module-requests', () => {
  it('200 – store admin lists own company requests', async () => {
    const res = await request(app)
      .get('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 – seller cannot list module requests', async () => {
    const res = await request(app)
      .get('/api/module-requests')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/module-requests');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/module-requests/all ─────────────────────────────────────────────
describe('GET /api/module-requests/all', () => {
  it('200 – platform admin lists all requests', async () => {
    const res = await request(app)
      .get('/api/module-requests/all')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 – store admin cannot list all requests', async () => {
    const res = await request(app)
      .get('/api/module-requests/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/module-requests ─────────────────────────────────────────────────
describe('POST /api/module-requests', () => {
  it('201 – store admin creates module activation request', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID, notes: 'Necesitamos este módulo' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('PENDING');
    createdIds.moduleRequestIds.push(res.body.data.id);
  });

  it('409 – cannot create a second PENDING request for the same module', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });
    expect(res.status).toBe(409);
  });

  it('400 – missing module_id', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('403 – seller cannot create module requests', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ module_id: MODULE_ID });
    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/module-requests/:id/approve ───────────────────────────────────
describe('PATCH /api/module-requests/:id/approve', () => {
  let requestId;

  beforeAll(async () => {
    // Use the request created in POST suite, or create a fresh one
    if (createdIds.moduleRequestIds.length) {
      requestId = createdIds.moduleRequestIds[0];
    }
  });

  it('403 – store admin cannot approve requests', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('200 – platform admin approves request', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });
});

// ── PATCH /api/module-requests/:id/reject ────────────────────────────────────
describe('PATCH /api/module-requests/:id/reject', () => {
  let requestId;

  beforeAll(async () => {
    // Create a fresh PENDING request to reject
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });

    if (res.status === 201) {
      requestId = res.body.data.id;
      createdIds.moduleRequestIds.push(requestId);
    }
  });

  it('200 – platform admin rejects request', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ comments: 'No cumple requisitos' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('403 – store admin cannot reject requests', async () => {
    const res = await request(app)
      .patch('/api/module-requests/1/reject')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});
