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
  // Suites connecting to the shared in-memory MongoDB can exceed the 5s
  // default when several of them set their database up concurrently
  testTimeout: 30000,
  setupFiles: ['dotenv/config'],
  globalSetup: '<rootDir>/__tests__/helpers/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/helpers/global-teardown.ts',
  roots: ['./__tests__'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/__tests__/tsconfig.json' },
    ],
  },
  // sanitize-html >= 2.18 depends on htmlparser2 >= 12 and its dom-* siblings, which ship
  // ESM only. Node resolves them at runtime but Jest's CommonJS loader cannot, so these
  // packages (hoisted or nested under sanitize-html) are compiled to CommonJS by ts-jest.
  transformIgnorePatterns: [
    '/node_modules/(?!(?:sanitize-html/node_modules/)?(?:htmlparser2|domhandler|domutils|entities|dom-serializer|domelementtype)/)',
  ],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: pathsToModuleNameMapper(paths, {
    prefix: '<rootDir>/src/',
  }),
};
