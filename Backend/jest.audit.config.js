module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['<rootDir>/audit/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFiles: ['reflect-metadata'],
  collectCoverage: true,
  collectCoverageFrom: [
    'audit/**/*.ts',
    '!audit/**/*.spec.ts',
    '!audit/audit.types.ts',
  ],
  coverageDirectory: '../coverage-audit',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
