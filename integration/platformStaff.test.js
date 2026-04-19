'use strict';

// Tests for /api/platform/users and /api/platform/roles (platform user management)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { User }     = require('../../pymeflowec-backend/src/models');

let platformAdminToken;
let adminToken;
const createdUserIds = [];

beforeAll(async () => {
  [platformAdminToken, adminToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
  ]);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await User.destroy({ where: { id: createdUserIds }, force: true });
  }
});

// ── GET /api/platform/roles ───────────────────────────────────────────────────
describe('GET /api/platform/roles', () => {
  it('200 – platform admin lists platform roles', async () => {
    const res = await request(app)
      .get('/api/platform/roles')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('scope', 'PLATFORM');
  });

  it('403 – store admin cannot list platform roles', async () => {
    const res = await request(app)
      .get('/api/platform/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/platform/roles');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/platform/users ───────────────────────────────────────────────────
describe('GET /api/platform/users', () => {
  it('200 – platform admin lists platform users', async () => {
    const res = await request(app)
      .get('/api/platform/users')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // At minimum the seed platform_admin and platform_support should appear
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('403 – store admin cannot list platform users', async () => {
    const res = await request(app)
      .get('/api/platform/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/platform/users ──────────────────────────────────────────────────
describe('POST /api/platform/users', () => {
  let platformRoleId;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/platform/roles')
      .set('Authorization', `Bearer ${platformAdminToken}`);
    // Use PLATFORM_SUPPORT role for the new user
    const supportRole = res.body.data.find(r => r.name === 'PLATFORM_SUPPORT');
    platformRoleId = supportRole?.id ?? res.body.data[0]?.id;
  });

  it('201 – platform admin creates a new platform user', async () => {
    const ts  = Date.now();
    const res = await request(app)
      .post('/api/platform/users')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        full_name: `Support User ${ts}`,
        email:     `support${ts}@test.com`,
        password:  'Support@1234',
        role_id:   platformRoleId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.role.scope).toBe('PLATFORM');
    createdUserIds.push(res.body.data.id);
  });

  it('409 – duplicate email', async () => {
    const res = await request(app)
      .post('/api/platform/users')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        full_name: 'Dup',
        email:     'platform_admin@test.com',
        password:  'Password@123',
        role_id:   platformRoleId,
      });
    expect(res.status).toBe(409);
  });

  it('400 – missing required fields', async () => {
    const res = await request(app)
      .post('/api/platform/users')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ full_name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('403 – store admin cannot create platform users', async () => {
    const res = await request(app)
      .post('/api/platform/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'X', email: 'x@t.com', password: 'P@ssword1', role_id: platformRoleId });
    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/platform/users/:id/deactivate ─────────────────────────────────
describe('PATCH /api/platform/users/:id/deactivate', () => {
  let targetUserId;

  beforeAll(async () => {
    if (createdUserIds.length) {
      targetUserId = createdUserIds[createdUserIds.length - 1];
    }
  });

  it('200 – platform admin deactivates a platform user', async () => {
    if (!targetUserId) return;
    const res = await request(app)
      .patch(`/api/platform/users/${targetUserId}/deactivate`)
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('403 – store admin cannot change platform user status', async () => {
    const res = await request(app)
      .patch('/api/platform/users/1/deactivate')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('404 – user not found', async () => {
    const res = await request(app)
      .patch('/api/platform/users/999999/deactivate')
      .set('Authorization', `Bearer ${platformAdminToken}`);
    expect(res.status).toBe(404);
  });
});
