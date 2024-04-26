// This line is important, as it will prevent the delete folder method to use actual logic
// As we don't want to test if deletion of azure files work or not, we skip it
// Mocking for this module must be done before any other imports
jest.mock('@utils/files/deleteFolder');

import { startDatabase } from '../src/server/database';

// Execute before each file.
beforeAll(async () => {
  await startDatabase();
}, 20000);

afterAll(async () => {
  // await stopDatabase();
  // Avoid memory issue
  if (global.gc) global.gc();
});
