'use strict';

const request      = require('supertest');
const app          = require('../../pymeflowec-backend/src/app');
const { getToken } = require('./helpers/auth');
const { cleanTestData } = require('../setup/factories');
const { sequelize } = require('../../pymeflowec-backend/src/config/database');

let platformAdminToken;
let adminToken;
let viewerToken;
const createdIds = { moduleRequestIds: [] };

// ID del módulo 'inventory' sembrado (id=3, no es default → requiere solicitud)
const MODULE_ID = 3;

beforeAll(async () => {
  // Limpiar cualquier solicitud/módulo previo para este MODULE_ID
  // (idempotencia entre ejecuciones: bypass FORCED RLS con row_security = off)
  await sequelize.transaction(async (t) => {
    await sequelize.query('SET LOCAL row_security = off', { transaction: t });
    await sequelize.query(
      `DELETE FROM organization_modules WHERE request_id IN
        (SELECT id FROM module_requests WHERE module_id = ${MODULE_ID})`,
      { transaction: t }
    );
    await sequelize.query(
      `DELETE FROM module_requests WHERE module_id = ${MODULE_ID}`,
      { transaction: t }
    );
  });

  [platformAdminToken, adminToken, viewerToken] = await Promise.all([
    getToken('platform_admin'),
    getToken('admin'),
    getToken('viewer'),
  ]);
});

afterAll(async () => {
  await cleanTestData(createdIds);
});

// ── GET /api/module-requests (propia organización) ────────────────────────────
describe('GET /api/module-requests', () => {
  it('200 – admin lista solicitudes de su organización', async () => {
    const res = await request(app)
      .get('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('401 – sin token', async () => {
    const res = await request(app).get('/api/module-requests');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/module-requests/all (platform staff) ────────────────────────────
describe('GET /api/module-requests/all', () => {
  it('200 – platform admin lista todas las solicitudes', async () => {
    const res = await request(app)
      .get('/api/module-requests/all')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('403 – usuario de organización no puede listar todas', async () => {
    const res = await request(app)
      .get('/api/module-requests/all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/module-requests ─────────────────────────────────────────────────
describe('POST /api/module-requests', () => {
  it('201 – admin crea solicitud de activación de módulo', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID, notes: 'Necesitamos inventario' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('pending');
    createdIds.moduleRequestIds.push(res.body.data.id);
  });

  it('409 – no se puede crear segunda solicitud pendiente para el mismo módulo', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });

    expect(res.status).toBe(409);
  });

  it('422 – falta module_id', async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ── PATCH /api/module-requests/:id/cancel ────────────────────────────────────
describe('PATCH /api/module-requests/:id/cancel', () => {
  let requestId;

  beforeAll(async () => {
    // Crear solicitud fresca para cancelar (la anterior puede estar en uso por /approve)
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });

    // Puede ser 201 (si la anterior fue aprobada/rechazada) o 409 (aún pendiente)
    if (res.status === 201) {
      requestId = res.body.data.id;
      createdIds.moduleRequestIds.push(requestId);
    } else {
      // Usar la primera creada
      requestId = createdIds.moduleRequestIds[0];
    }
  });

  it('200 – admin cancela su propia solicitud pendiente', async () => {
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('404 – no puede cancelar solicitud ya cancelada', async () => {
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/module-requests/:id/approve ───────────────────────────────────
describe('PATCH /api/module-requests/:id/approve', () => {
  let requestId;

  beforeAll(async () => {
    // Crear una solicitud pendiente nueva para aprobar
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });

    if (res.status === 201) {
      requestId = res.body.data.id;
      createdIds.moduleRequestIds.push(requestId);
    }
  });

  it('403 – usuario de organización no puede aprobar', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('200 – platform admin aprueba la solicitud', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/module-requests/:id/reject ────────────────────────────────────
describe('PATCH /api/module-requests/:id/reject', () => {
  let requestId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/module-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: MODULE_ID });

    if (res.status === 201) {
      requestId = res.body.data.id;
      createdIds.moduleRequestIds.push(requestId);
    }
  });

  it('200 – platform admin rechaza la solicitud con motivo', async () => {
    if (!requestId) return;
    const res = await request(app)
      .patch(`/api/module-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ reason: 'No cumple requisitos' });

    expect(res.status).toBe(200);
  });

  it('403 – usuario de organización no puede rechazar', async () => {
    const res = await request(app)
      .patch(`/api/module-requests/1/reject`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});
