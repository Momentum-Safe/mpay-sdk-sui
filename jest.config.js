/* eslint @typescript-eslint/naming-convention: 0 */
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  moduleDirectories: ['node_modules', 'src', 'test'],
  moduleNameMapper: {
    '^@root(.*)$': '<rootDir>/src$1',
    '^@utils(.*)$': '<rootDir>/src/utils.ts$1',
    '^@modules(.*)$': '<rootDir>/src/modules$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageReporters: ['json', 'text', 'cobertura'],
  maxWorkers: 5,
  testTimeout: 300000,
};
