import { pathsToModuleNameMapper } from 'ts-jest';

/** Duplicate the paths found in tsconfig. */
const paths = {
  '@const/*': ['const/*'],
  '@models': ['models'],
  '@models/*': ['models/*'],
  '@routes/*': ['routes/*'],
  '@schema/*': ['schema/*'],
  '@security/*': ['security/*'],
  '@server/*': ['server/*'],
  '@services/*': ['services/*'],
  '@utils/*': ['utils/*'],
  '@lib/*': ['lib/*'],
};

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  globalSetup: '<rootDir>/__tests__/helpers/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/helpers/global-teardown.ts',
  roots: ['./__tests__'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/__tests__/tsconfig.json' },
    ],
  },
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: pathsToModuleNameMapper(paths, {
    prefix: '<rootDir>/src/',
  }),
};
