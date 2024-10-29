import mongoose from 'mongoose';
import MongoStorage from './mongoStorage';
import { load } from 'migrate';
import { startDatabase } from '@server/database';

/** Command, up or down */
const command = process.argv[2] || 'up';
/** Migration to target */
const targetMigration = process.argv[3] || undefined;

/**
 * Run migrations
 */
async function runMigrations() {
  const storage = new MongoStorage();
  await startDatabase();

  load({ stateStore: storage }, (err: Error | null, set) => {
    if (err) throw err;
    const callback = (error: Error | null) => {
      if (error) {
        console.error(`Migration ${command} failed:`, error);
      } else {
        console.log(`Migration ${command} successfully finished`);
      }
      mongoose.disconnect();
    };
    switch (command) {
      case 'up':
        if (targetMigration) {
          set.up(targetMigration, callback);
        } else {
          set.up(callback);
        }
        break;
      case 'down':
        if (targetMigration) {
          set.down(targetMigration, callback);
        } else {
          set.down(callback);
        }
        break;
      default:
        console.error('Unknown command');
        mongoose.disconnect();
        return;
    }
  });
}

runMigrations().catch((err) => console.error(err));
