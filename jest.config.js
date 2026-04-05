'use strict';

module.exports = {
  projects: [
    {
      displayName:  'unit',
      testMatch:    ['<rootDir>/unit/**/*.test.js'],
      testEnvironment: 'node',
      // Fuerza que bcryptjs y jsonwebtoken resuelvan SIEMPRE al mismo módulo
      // (el del backend), para que jest.mock() intercepte correctamente.
      moduleNameMapper: {
        '^bcryptjs$':     '<rootDir>/../pymeflowec-backend/node_modules/bcryptjs',
        '^jsonwebtoken$': '<rootDir>/../pymeflowec-backend/node_modules/jsonwebtoken',
      },
    },
    {
      displayName:  'integration',
      testMatch:    ['<rootDir>/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFiles:   ['<rootDir>/setup/loadEnv.js'],
    },
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '../pymeflowec-backend/src/**/*.js',
    '!../pymeflowec-backend/src/config/**',
    '!../pymeflowec-backend/src/models/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './html-report',
      filename: 'report.html',
      openReport: true,
    }],
  ],
};
