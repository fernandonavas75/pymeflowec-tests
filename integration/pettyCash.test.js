'use strict';

// Tests for /api/petty-cash (PettyCash resource, requires MOD_FINANCE)
const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');

let adminToken;
let sellerToken;
let warehouseToken;
const createdIds = { pettyCashIds: [] };

// Closes any currently-open petty cash session so tests start clean
const closeOpenSession = async () => {
  const res = await request(app)
    .get('/api/petty-cash/open')
    .set('Authorization', `Bearer ${adminToken}`);
  if (res.status === 200 && res.body.data?.id) {
    await request(app)
      .patch(`/api/petty-cash/${res.body.data.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Cierre automático por setup de tests' });
  }
};

// Opens a fresh session and returns its ID
const openSession = async (name) => {
  await closeOpenSession();
  const res = await request(app)
    .post('/api/petty-cash/open')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ opening_amount: 200.00, name });
  createdIds.pettyCashIds.push(res.body.data.id);
  return res.body.data.id;
};

beforeAll(async () => {
  [adminToken, sellerToken, warehouseToken] = await Promise.all([
    getToken('admin'),
    getToken('seller'),
    getToken('warehouse'),
  ]);
  await closeOpenSession();
});

afterAll(async () => {
  await closeOpenSession();
  await cleanTestData(createdIds);
});

// ── GET /api/petty-cash ───────────────────────────────────────────────────────
describe('GET /api/petty-cash', () => {
  it('200 – admin lists sessions', async () => {
    const res = await request(app)
      .get('/api/petty-cash')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 – seller can list sessions', async () => {
    const res = await request(app)
      .get('/api/petty-cash')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });

  it('401 – no token', async () => {
    const res = await request(app).get('/api/petty-cash');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/petty-cash/open ─────────────────────────────────────────────────
describe('POST /api/petty-cash/open', () => {
  it('201 – admin opens petty cash session', async () => {
    await closeOpenSession();
    const res = await request(app)
      .post('/api/petty-cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ opening_amount: 100.00, name: `Sesión Test ${Date.now()}`, notes: 'Apertura de prueba' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(Number(res.body.data.opening_amount)).toBe(100);
    createdIds.pettyCashIds.push(res.body.data.id);
  });

  it('409 – cannot open another session while one is open', async () => {
    const res = await request(app)
      .post('/api/petty-cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ opening_amount: 50.00 });
    expect(res.status).toBe(409);
  });

  it('403 – seller cannot open petty cash', async () => {
    await closeOpenSession();
    const res = await request(app)
      .post('/api/petty-cash/open')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ opening_amount: 50.00 });
    expect(res.status).toBe(403);
  });

  it('422 – missing opening_amount', async () => {
    const res = await request(app)
      .post('/api/petty-cash/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sin monto' });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/petty-cash/open ──────────────────────────────────────────────────
describe('GET /api/petty-cash/open', () => {
  it('200 or 404 – returns open session status', async () => {
    const res = await request(app)
      .get('/api/petty-cash/open')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveProperty('id');
    }
  });
});

// ── POST /api/petty-cash/:id/movements ───────────────────────────────────────
describe('POST /api/petty-cash/:id/movements', () => {
  let sessionId;

  beforeAll(async () => {
    sessionId = await openSession(`Sesión Movimientos ${Date.now()}`);
  });

  it('201 – admin records EXPENSE movement', async () => {
    const res = await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movement_type: 'EXPENSE', amount: 30.00, description: 'Compra cafetería' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.movement_type).toBe('EXPENSE');
  });

  it('201 – seller can record movement', async () => {
    const res = await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ movement_type: 'EXPENSE', amount: 15.00, description: 'Gasto vendedor' });

    expect(res.status).toBe(201);
  });

  it('201 – admin records REPLENISH movement', async () => {
    const res = await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movement_type: 'REPLENISH', amount: 100.00, description: 'Reposición de fondos' });

    expect(res.status).toBe(201);
    expect(res.body.data.movement_type).toBe('REPLENISH');
  });

  it('403 – warehouse cannot record movements', async () => {
    const res = await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ movement_type: 'EXPENSE', amount: 5.00, description: 'Intento' });
    expect(res.status).toBe(403);
  });

  it('422 – missing required description', async () => {
    const res = await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movement_type: 'EXPENSE', amount: 5.00 });
    expect(res.status).toBe(422);
  });
});

// ── GET /api/petty-cash/:id/movements ────────────────────────────────────────
describe('GET /api/petty-cash/:id/movements', () => {
  let sessionId;

  beforeAll(async () => {
    sessionId = await openSession(`Sesión ListMovements ${Date.now()}`);
    await request(app)
      .post(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movement_type: 'EXPENSE', amount: 10.00, description: 'Test mvmt' });
  });

  it('200 – admin lists movements for a session', async () => {
    const res = await request(app)
      .get(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('200 – seller can view movements', async () => {
    const res = await request(app)
      .get(`/api/petty-cash/${sessionId}/movements`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/petty-cash/:id/close ──────────────────────────────────────────
describe('PATCH /api/petty-cash/:id/close', () => {
  let sessionId;

  beforeAll(async () => {
    sessionId = await openSession(`Sesión Para Cerrar ${Date.now()}`);
  });

  it('403 – seller cannot close petty cash', async () => {
    const res = await request(app)
      .patch(`/api/petty-cash/${sessionId}/close`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ closing_amount_reported: 200.00 });
    expect(res.status).toBe(403);
  });

  it('200 – admin closes petty cash session', async () => {
    const res = await request(app)
      .patch(`/api/petty-cash/${sessionId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ closing_amount_reported: 195.00, notes: 'Cierre de prueba' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('closed_at');
  });
});
