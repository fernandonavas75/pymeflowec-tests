'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { User }     = require('../../pymeflowec-backend/src/models');
const { sequelize } = require('../../pymeflowec-backend/src/config/database');

let platformAdminToken;
let adminToken;

// IDs de staff creados durante los tests para limpieza posterior
const createdStaffIds = [];

beforeAll(async () => {
  [platformAdminToken, adminToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
  ]);
});

afterAll(async () => {
  if (createdStaffIds.length) {
    const ids = createdStaffIds.join(',');
    // Remove audit log references before deleting staff records
    await sequelize.query(`DELETE FROM platform_audit_logs WHERE staff_id IN (${ids})`);
    await sequelize.query(`DELETE FROM platform_staff WHERE id IN (${ids})`);
  }
});

// ── GET /api/platform/staff/roles ────────────────────────────────────────────
describe('GET /api/platform/staff/roles', () => {
  it('200 – platform admin lista roles de plataforma', async () => {
    const res = await request(app)
      .get('/api/platform/staff/roles')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('403 – usuario de organización no puede listar roles', async () => {
    const res = await request(app)
      .get('/api/platform/staff/roles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/platform/staff/roles');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/staff ───────────────────────────────────────────────────
describe('GET /api/platform/staff', () => {
  it('200 – platform admin lista todo el staff', async () => {
    const res = await request(app)
      .get('/api/platform/staff')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Al menos el platform_admin semilla debe estar
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('403 – usuario de organización no puede listar staff', async () => {
    const res = await request(app)
      .get('/api/platform/staff')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/platform/staff ─────────────────────────────────────────────────
describe('POST /api/platform/staff', () => {
  let targetUserId;

  beforeAll(async () => {
    // Usar seller (no admin) para no interferir con platformModules.test.js,
    // que verifica que admin no tenga acceso de plataforma.
    const user = await User.findOne({ where: { email: 'seller@test.com' } });
    targetUserId = user.id;
  });

  it('201 – platform admin asigna usuario como staff', async () => {
    const res = await request(app)
      .post('/api/platform/staff')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ user_id: targetUserId, platform_role_id: 2, notes: 'Test support staff' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    createdStaffIds.push(res.body.data.id);
  });

  it('422 – falta user_id', async () => {
    const res = await request(app)
      .post('/api/platform/staff')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ platform_role_id: 1 });

    expect(res.status).toBe(422);
  });

  it('422 – falta platform_role_id', async () => {
    const res = await request(app)
      .post('/api/platform/staff')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ user_id: targetUserId });

    expect(res.status).toBe(422);
  });

  it('403 – usuario de organización no puede asignar staff', async () => {
    const res = await request(app)
      .post('/api/platform/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: targetUserId, platform_role_id: 2 });

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/platform/staff/:id/revoke ─────────────────────────────────────
describe('PATCH /api/platform/staff/:id/revoke', () => {
  let staffId;

  beforeAll(async () => {
    // Usar el staff creado en el bloque POST si existe, si no crear uno nuevo
    if (createdStaffIds.length) {
      staffId = createdStaffIds[createdStaffIds.length - 1];
    } else {
      const user = await User.findOne({ where: { email: 'viewer@test.com' } });
      const res  = await request(app)
        .post('/api/platform/staff')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ user_id: user.id, platform_role_id: 2 });
      staffId = res.body.data?.id;
      if (staffId) createdStaffIds.push(staffId);
    }
  });

  it('200 – platform admin revoca acceso de staff', async () => {
    if (!staffId) return;
    const res = await request(app)
      .patch(`/api/platform/staff/${staffId}/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('403 – usuario de organización no puede revocar staff', async () => {
    const res = await request(app)
      .patch('/api/platform/staff/1/revoke')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('404 – staff inexistente', async () => {
    const res = await request(app)
      .patch('/api/platform/staff/999999/revoke')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(404);
  });
});
