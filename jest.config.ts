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
  roots: ['./__tests__'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  modulePathIgnorePatterns: ['./__tests__/old'],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: pathsToModuleNameMapper(paths, {
    prefix: '<rootDir>/src/',
  }),
};
