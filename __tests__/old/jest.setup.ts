import { startDatabase } from '../../src/server/database';

// Execute before each file.
beforeAll(async () => {
  await startDatabase();
}, 20000);

afterAll(async () => {
  //await stopDatabase();
});
