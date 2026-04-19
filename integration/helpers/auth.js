'use strict';

const request = require('supertest');
const app     = require('../../../pymeflowec-backend/src/app');
const { CREDENTIALS } = require('../../setup/factories');

/**
 * Logs in and returns the access token for the given seed user.
 * @param {'platform_admin'|'platform_support'|'admin'|'seller'|'warehouse'} role
 */
const getToken = async (role = 'admin') => {
  const { email, password } = CREDENTIALS[role];
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.access_token ?? res.body.accessToken;
};

module.exports = { getToken };
