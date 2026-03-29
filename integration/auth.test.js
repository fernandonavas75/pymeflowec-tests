'use strict';

const request = require('supertest');
const app     = require('../../pymeflowec-backend/src/app');

// ── login ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('200 – devuelve accessToken y refreshToken con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  it('401 – credenciales incorrectas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('422 – email inválido (validación)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: '12345678' });
    expect(res.status).toBe(422);
  });

  it('401 – usuario no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Admin@1234' });
    expect(res.status).toBe(401);
  });
});

// ── me ────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });
    token = res.body.data.accessToken;
  });

  it('200 – devuelve el perfil del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@test.com');
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  let refreshToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });
    refreshToken = res.body.data.refreshToken;
  });

  it('200 – genera nuevo accessToken con refresh token válido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('401 – refresh token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'token_invalido' });
    expect(res.status).toBe(401);
  });
});

// ── forgot-password ───────────────────────────────────────────────────────────
describe('POST /api/auth/forgot-password', () => {
  it('200 – siempre devuelve 200 (por seguridad) aunque el email no exista', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noexiste@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('422 – email inválido', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-email' });
    expect(res.status).toBe(422);
  });
});
