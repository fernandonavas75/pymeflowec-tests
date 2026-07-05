'use strict';

// Each integration test file gets its own module registry, so each one creates
// its own Sequelize pool (min:2 connections) that's never released on its own.
// Without closing it, those idle sockets keep Node's event loop alive forever,
// so `jest` never exits by itself once the suite finishes.
//
// Call this as the LAST line of each test file's own afterAll (after any
// cleanTestData/cleanup calls) — never via setupFilesAfterEnv, since hooks at
// the same nesting level run in declaration order, and a hook registered
// before the test file's own afterAll would close the connection too early.
const { sequelize } = require('../../pymeflowec-backend/src/config/database');

module.exports = async function closeDb() {
  await sequelize.close();
};
