'use strict';

// Tests for /api/users (User resource — store users managed by STORE_ADMIN)
// Mailer is mocked: forgot-password tests would otherwise try to reach the
// real SMTP host with fake credentials, which hangs long enough to blow past
// Jest's test timeout.
jest.mock('../../pymeflowec-backend/src/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  WelcomeEmail:           jest.fn().mockResolvedValue(true),
  verifyConnection:       jest.fn().mockResolvedValue(undefined),
}));

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { Role }     = require('../../pymeflowec-backend/src/models');
const { cleanTestData } = require('../setup/factories');
const closeDb           = require('../setup/closeDb');

let adminToken;
let sellerToken;
let sellerRoleId;
const createdIds = { userIds: [] };

beforeAll(async () => {
  [adminToken, sellerToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
  ]);

  // Get a valid STORE role id to use when creating users
  const role = await Role.findOne({ where: { name: 'STORE_SELLER' } });
  sellerRoleId = role.id;
});

afterAll(async () => {
  await cleanTestData(createdIds);
  await closeDb();
});

// ── GET /api/users ────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  it('200 – admin lists store users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403 – seller cannot list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────
describe('POST /api/users', () => {
  it('201 – admin creates store user', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `Usuario Test ${ts}`,
        email:     `user${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.email).toBe(`user${ts}@test.com`);
    expect(res.body.data).not.toHaveProperty('password_hash');
    createdIds.userIds.push(res.body.data.id);
  });

  it('409 – duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: 'Duplicado',
        email:     'admin@test.com',
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    expect(res.status).toBe(409);
  });

  it('403 – seller cannot create users', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        full_name: 'Intento',
        email:     `seller_attempt${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
describe('GET /api/users/:id', () => {
  let userId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `GetById User ${ts}`,
        email:     `getbyid${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    userId = res.body.data.id;
    createdIds.userIds.push(userId);
  });

  it('200 – admin gets user by id', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('403 – seller cannot get user by id', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('404 – user not found', async () => {
    const res = await request(app)
      .get('/api/users/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
describe('PUT /api/users/:id', () => {
  let userId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `Actualizable ${ts}`,
        email:     `updateuser${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    userId = res.body.data.id;
    createdIds.userIds.push(userId);
  });

  it('200 – admin updates user full_name', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Nombre Actualizado' });

    expect(res.status).toBe(200);
    expect(res.body.data.full_name).toBe('Nombre Actualizado');
  });

  it('403 – seller cannot update users', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ full_name: 'Intento' });
    expect(res.status).toBe(403);
  });

  it('404 – user not found', async () => {
    const res = await request(app)
      .put('/api/users/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'XX' });
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/users/:id/activate and /deactivate and /lock ──────────────────
describe('PATCH /api/users/:id/activate, deactivate, lock', () => {
  let userId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `StatusUser ${ts}`,
        email:     `statususer${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    userId = res.body.data.id;
    createdIds.userIds.push(userId);
  });

  it('200 – admin deactivates user', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('200 – admin activates user', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('200 – admin locks user', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LOCKED');
  });

  it('403 – seller cannot deactivate users', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}/activate`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
describe('DELETE /api/users/:id', () => {
  let userId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: `Para Eliminar ${ts}`,
        email:     `deleteuser${ts}@test.com`,
        password:  'Password@1234',
        role_id:   sellerRoleId,
      });
    userId = res.body.data.id;
  });

  it('204 – admin deletes user', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – seller cannot delete users', async () => {
    const res = await request(app)
      .delete('/api/users/1')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/users/forgot-password (public) ──────────────────────────────────
describe('POST /api/users/forgot-password', () => {
  it('200 – returns ok for existing email (no details leaked)', async () => {
    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('200 – unknown email returns same generic ok (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'noexiste@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
