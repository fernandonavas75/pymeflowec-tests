'use strict';

const request = require('supertest');
const app     = require('../../pymeflowec-backend/src/app');

// ── login ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('200 – devuelve access_token y refresh_token con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user.email).toBe('admin@test.com');
    // platform_staff debe ser null para un usuario de organización sin staff de plataforma
    expect(res.body.user.platform_staff).toBeNull();
  });

  it('200 – platform_staff no es null cuando el usuario es staff de plataforma', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'platform_admin@test.com', password: 'PlatformAdmin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.user.platform_staff).not.toBeNull();
    expect(res.body.user.platform_staff.can_write).toBe(true);
    expect(res.body.user.platform_staff.can_read).toBe(true);
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
    token = res.body.access_token;
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
    refreshToken = res.body.refresh_token;
  });

  it('200 – genera nuevo access_token con refresh token válido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
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
