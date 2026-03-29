'use strict';

const request = require('supertest');
const app     = require('../../../pymeflowec-backend/src/app');

const { CREDENTIALS } = require('../../setup/factories');

/**
 * Realiza login y devuelve el accessToken del usuario indicado.
 * @param {'superadmin'|'admin'|'seller'|'viewer'} role
 */
const getToken = async (role = 'admin') => {
  const { email, password } = CREDENTIALS[role];
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.data?.accessToken ?? res.body.accessToken;
};

module.exports = { getToken };
