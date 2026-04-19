'use strict';

const request = require('supertest');
const app     = require('../../pymeflowec-backend/src/app');

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('200 – returns access_token, refresh_token and user payload', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user.role.name).toBe('STORE_ADMIN');
    expect(res.body.user.role.scope).toBe('STORE');
    expect(res.body.user.company).not.toBeNull();
  });

  it('200 – platform admin has null company and PLATFORM scope', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'platform_admin@test.com', password: 'PlatformAdmin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.user.role.name).toBe('PLATFORM_ADMIN');
    expect(res.body.user.role.scope).toBe('PLATFORM');
    expect(res.body.user.company).toBeNull();
  });

  it('401 – wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword123' });
    expect(res.status).toBe(401);
  });

  it('401 – user does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Admin@1234' });
    expect(res.status).toBe(401);
  });

  it('422 – invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: 'Admin@1234' });
    expect(res.status).toBe(422);
  });

  it('422 – missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });
    token = res.body.access_token;
  });

  it('200 – returns authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@test.com');
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 – invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  let refreshToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });
    refreshToken = res.body.refresh_token;
  });

  it('200 – issues new access_token with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('access_token');
  });

  it('401 – invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'token_invalido' });
    expect(res.status).toBe(401);
  });

  it('422 – missing refresh_token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(422);
  });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201 – creates new company and returns tokens', async () => {
    const ts = Date.now();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        company_name: `Empresa Reg ${ts}`,
        full_name:    'Owner Test',
        email:        `owner${ts}@test.com`,
        password:     'Password@123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user.role.name).toBe('STORE_ADMIN');
  });

  it('409 – email already registered', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        company_name: 'Another Company',
        full_name:    'Another Owner',
        email:        'admin@test.com',
        password:     'Password@123',
      });
    expect(res.status).toBe(409);
  });

  it('422 – missing company_name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ full_name: 'Owner', email: 'x@test.com', password: 'Password@123' });
    expect(res.status).toBe(422);
  });

  it('422 – password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ company_name: 'Co', full_name: 'Owner', email: 'x2@test.com', password: 'short' });
    expect(res.status).toBe(422);
  });
});

// ── PATCH /api/auth/change-password ──────────────────────────────────────────
describe('PATCH /api/auth/change-password', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@test.com', password: 'Seller@1234' });
    token = res.body.access_token;
  });

  it('400 – wrong current password', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'Wrong@1234', new_password: 'NewPass@1234' });
    expect(res.status).toBe(400);
  });

  it('401 – no token', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .send({ current_password: 'Seller@1234', new_password: 'NewPass@1234' });
    expect(res.status).toBe(401);
  });
});
