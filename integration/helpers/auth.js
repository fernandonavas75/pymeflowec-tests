'use strict';

const request = require('supertest');
const app     = require('../../../pymeflowec-backend/src/app');

const { CREDENTIALS } = require('../../setup/factories');

/**
 * Realiza login y devuelve el accessToken del usuario indicado.
 * @param {'platform_admin'|'superadmin'|'admin'|'seller'|'viewer'} role
 */
const getToken = async (role = 'admin') => {
  const { email, password } = CREDENTIALS[role];
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  // El servicio retorna access_token (snake_case); el controller lo esparce en el body
  return res.body.access_token ?? res.body.accessToken;
};

module.exports = { getToken };
