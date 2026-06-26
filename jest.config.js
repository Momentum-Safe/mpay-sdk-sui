/* eslint @typescript-eslint/naming-convention: 0 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@root(.*)$': '<rootDir>/src$1',
    '^@utils(.*)$': '<rootDir>/src/utils.ts$1',
    '^@modules(.*)$': '<rootDir>/src/modules$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageReporters: ['json', 'text', 'cobertura'],
  globalSetup: '<rootDir>/test/jest.globalSetup.ts',
  testSequencer: '<rootDir>/test/jest.sequencer.cjs',
  // Network-heavy suites share testnet faucet/backend; parallel runs hit rate limits and look "stuck".
  maxWorkers: process.env.CI ? 2 : 1,
  testTimeout: 180_000,
};
