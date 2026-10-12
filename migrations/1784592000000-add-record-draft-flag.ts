import { Record } from '@models';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description =
  'Exclude draft records from the unique incremental id index.';

/** Existing unique incremental id index name. */
const RECORD_INCREMENTAL_ID_INDEX = 'incrementalId_1_resource_1';

/**
 * Checks if an index operation failed because the index does not exist.
 *
 * @param err Error thrown by MongoDB.
 * @returns True when the error is an index-not-found error.
 */
const isIndexNotFoundError = (err: unknown): boolean => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'codeName' in err &&
    (err as { codeName?: string }).codeName === 'IndexNotFound'
  );
};

/**
 * Drops an index if it already exists.
 *
 * @param indexName Name of the index to drop.
 */
const dropIndexIfExists = async (indexName: string): Promise<void> => {
  try {
    await Record.collection.dropIndex(indexName);
  } catch (err) {
    if (!isIndexNotFoundError(err)) {
      throw err;
    }
  }
};

/**
 * Recreates the unique incremental id index so it only covers records that
 * have an incremental id. Draft records are stored without one, so they are
 * excluded from it, whatever the value of their draft flag.
 *
 * Mongoose cannot change the options of an existing index on startup, so the
 * index has to be dropped and created again here.
 */
export const up = async () => {
  await startDatabaseForMigration();

  await dropIndexIfExists(RECORD_INCREMENTAL_ID_INDEX);
  await Record.collection.createIndex(
    { incrementalId: 1, resource: 1 },
    {
      name: RECORD_INCREMENTAL_ID_INDEX,
      unique: true,
      partialFilterExpression: {
        resource: { $exists: true },
        incrementalId: { $exists: true },
      },
    }
  );
};

/**
 * Restores the previous unique incremental id index.
 */
export const down = async () => {
  await startDatabaseForMigration();

  await dropIndexIfExists(RECORD_INCREMENTAL_ID_INDEX);
  await Record.collection.createIndex(
    { incrementalId: 1, resource: 1 },
    {
      name: RECORD_INCREMENTAL_ID_INDEX,
      unique: true,
      partialFilterExpression: { resource: { $exists: true } },
    }
  );
};
