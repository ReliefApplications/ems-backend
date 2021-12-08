import { startDatabase, stopDatabase } from '../src/server/database';

// Execute before each file.
beforeAll(async () => {
  await startDatabase();
}, 15000);

afterAll(async () => {
  await stopDatabase();
});

