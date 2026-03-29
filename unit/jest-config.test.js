'use strict';

describe('jest.config.js', () => {
  let jestConfig;

  beforeEach(() => {
    jest.resetModules();
    jestConfig = require('../jest.config.js');
  });

  describe('projects configuration', () => {
    it('should have exactly 2 projects defined', () => {
      expect(jestConfig.projects).toHaveLength(2);
    });

    describe('unit project', () => {
      let unitProject;

      beforeEach(() => {
        unitProject = jestConfig.projects[0];
      });

      it('should have correct displayName', () => {
        expect(unitProject.displayName).toBe('unit');
      });

      it('should have correct testMatch pattern', () => {
        expect(unitProject.testMatch).toEqual(['<rootDir>/unit/**/*.test.js']);
      });

      it('should use node testEnvironment', () => {
        expect(unitProject.testEnvironment).toBe('node');
      });

      it('should not have setupFiles', () => {
        expect(unitProject.setupFiles).toBeUndefined();
      });
    });

    describe('integration project', () => {
      let integrationProject;

      beforeEach(() => {
        integrationProject = jestConfig.projects[1];
      });

      it('should have correct displayName', () => {
        expect(integrationProject.displayName).toBe('integration');
      });

      it('should have correct testMatch pattern', () => {
        expect(integrationProject.testMatch).toEqual(['<rootDir>/integration/**/*.test.js']);
      });

      it('should use node testEnvironment', () => {
        expect(integrationProject.testEnvironment).toBe('node');
      });

      it('should have setupFiles configured', () => {
        expect(integrationProject.setupFiles).toBeDefined();
        expect(integrationProject.setupFiles).toContain('<rootDir>/setup/loadEnv.js');
      });
    });
  });

  describe('coverage configuration', () => {
    it('should set coverageDirectory to coverage', () => {
      expect(jestConfig.coverageDirectory).toBe('coverage');
    });

    it('should collect coverage from backend src directory', () => {
      expect(jestConfig.collectCoverageFrom).toContain('../pymeflowec-backend/src/**/*.js');
    });

    it('should exclude config directory from coverage', () => {
      expect(jestConfig.collectCoverageFrom).toContain('!../pymeflowec-backend/src/config/**');
    });

    it('should exclude models directory from coverage', () => {
      expect(jestConfig.collectCoverageFrom).toContain('!../pymeflowec-backend/src/models/**');
    });

    it('should have 3 coverage exclusion rules', () => {
      expect(jestConfig.collectCoverageFrom).toHaveLength(3);
    });

    it('should generate text, lcov, and html coverage reports', () => {
      expect(jestConfig.coverageReporters).toEqual(['text', 'lcov', 'html']);
    });
  });

  describe('test timeout', () => {
    it('should set testTimeout to 15000ms', () => {
      expect(jestConfig.testTimeout).toBe(15000);
    });

    it('should be greater than 10000ms', () => {
      expect(jestConfig.testTimeout).toBeGreaterThan(10000);
    });
  });

  describe('overall structure', () => {
    it('should export a valid configuration object', () => {
      expect(jestConfig).toBeDefined();
      expect(typeof jestConfig).toBe('object');
    });

    it('should have all required properties', () => {
      expect(jestConfig).toHaveProperty('projects');
      expect(jestConfig).toHaveProperty('coverageDirectory');
      expect(jestConfig).toHaveProperty('collectCoverageFrom');
      expect(jestConfig).toHaveProperty('coverageReporters');
      expect(jestConfig).toHaveProperty('testTimeout');
    });

    it('should have projects as an array', () => {
      expect(Array.isArray(jestConfig.projects)).toBe(true);
    });

    it('should have collectCoverageFrom as an array', () => {
      expect(Array.isArray(jestConfig.collectCoverageFrom)).toBe(true);
    });

    it('should have coverageReporters as an array', () => {
      expect(Array.isArray(jestConfig.coverageReporters)).toBe(true);
    });
  });
});
