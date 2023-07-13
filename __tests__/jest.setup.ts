import { startDatabase } from '../src/server/database';

// Execute before each file.
beforeAll(async () => {
  await startDatabase({ poolSize: 10 });
}, 35000);

afterAll(async () => {
  //await stopDatabase();
});
