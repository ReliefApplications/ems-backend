import {
  startDatabase,
  initDatabase,
  stopDatabase,
} from '../src/server/database';
import * as dotenv from 'dotenv';
import { Client } from '../src/models';
dotenv.config();

// Execute before all tests.
export default async () => {
  if (process.env.CI) {
    await startDatabase();
    await initDatabase();
    const client = new Client({
      clientId: process.env.clientID,
      name: 'Test user',
    });
    await client.save();
    await stopDatabase();
  }
};
