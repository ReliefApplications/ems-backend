import { CallbackError, MigrationSet } from 'migrate';
import { Migration } from '../models/migration.model';

/** Migration store interface */
interface Store {
  lastRun?: string;
  migrations: {
    title: string;
    timestamp: number;
    description: string;
  }[];
}

/** Mongo storage for migrations class */
class MongoStorage {
  /**
   * Load migrations from MongoDB
   *
   * @param callback Callback to do once data was loaded
   */
  async load(callback: (err: any, store: Store) => void) {
    const store: Store = {
      lastRun: undefined,
      migrations: [],
    };
    try {
      const migrations = await Migration.find().sort({ timestamp: -1 });
      if (migrations.length > 0) {
        store.lastRun = migrations[0].title;
        store.migrations = migrations.reverse().map((x) => ({
          title: x.title,
          description: x.description,
          timestamp: x.timestamp,
        }));
      }
      return callback(null, store);
    } catch (error) {
      callback(error, null);
    }
  }

  /**
   * Save or update migrations in MongoDB
   *
   * @param set Object containing lastRun and migrations
   * @param callback Function to handle the result or error
   */
  async save(set: MigrationSet, callback: CallbackError) {
    try {
      for (const migration of set.migrations) {
        const existingMigration = await Migration.findOne({
          title: migration.title,
        });
        if (migration.timestamp) {
          if (!existingMigration) {
            await Migration.create({
              title: migration.title,
              timestamp: migration.timestamp,
              description: migration.description,
            });
          }
        } else {
          if (existingMigration) {
            await Migration.deleteOne({ title: migration.title });
          }
        }
      }
      callback(null);
    } catch (error) {
      console.error('error while saving', error);
      callback(error);
    }
  }
}

export default MongoStorage;
