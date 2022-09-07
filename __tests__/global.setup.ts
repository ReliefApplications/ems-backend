import {
  startDatabase,
  initDatabase,
  stopDatabase,
} from '../src/server/database';
import * as dotenv from 'dotenv';
dotenv.config();

/** Executes before all tests */
export default async () => {
  if (process.env.NODE_ENV !== 'production') {
    await startDatabase();
    await initDatabase();
    // const client = new Client({
    //   clientId: process.env.clientID,
    //   name: 'Test user',
    // });
    // await client.save();
    await stopDatabase();
  }
};
