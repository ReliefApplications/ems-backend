import { CallbackError, MigrationSet } from 'migrate';
import { Migration } from './src/models/migration.model';

/** Mongo storage for migrations class */
class MongoStorage {
  /**
   * Load migrations from MongoDB
   *
   * @param callback Callback to do once data was loaded
   */
  async load(
    callback: (
      err: any,
      store: {
        lastRun?: string;
        migrations: {
          title: string;
          timestamp: number;
          description: string;
        }[];
      }
    ) => void
  ) {
    try {
      const result = await Migration.find().sort({ createdAt: -1 });
      if (result.length === 0) {
        const migration = { lastRun: null, migrations: [] };
        await Migration.create(migration);
        return callback(null, migration);
      }
      await Migration.create({
        lastRun: result[0].lastRun,
        migrations: result[0].migrations,
      });
      callback(null, result[0]);
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
      const latestMigration = await Migration.findOne().sort({ createdAt: -1 });
      await Migration.updateOne(
        { _id: latestMigration._id },
        {
          $set: {
            lastRun: set.lastRun,
            migrations: set.migrations,
          },
        }
      );
      callback(null);
    } catch (error) {
      console.error('error while saving', error);
      callback(error);
    }
  }
}

export default MongoStorage;
