import { Record } from '@models';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description =
  'Add draft flag to records and update record id index.';

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
 * Adds the draft flag and recreates the unique incremental id index so draft
 * records, which do not receive an incremental id, are excluded from it.
 */
export const up = async () => {
  await startDatabaseForMigration();

  await Record.updateMany(
    { draft: { $exists: false } },
    { $set: { draft: false } },
    { timestamps: false }
  );

  await dropIndexIfExists(RECORD_INCREMENTAL_ID_INDEX);
  await Record.collection.createIndex(
    { incrementalId: 1, resource: 1 },
    {
      name: RECORD_INCREMENTAL_ID_INDEX,
      unique: true,
      partialFilterExpression: {
        resource: { $exists: true },
        incrementalId: { $exists: true },
        draft: false,
      },
    }
  );

  await Record.collection.createIndex(
    { draft: 1, form: 1, resource: 1, createdAt: 1 },
    { name: 'draft_1_form_1_resource_1_createdAt_1' }
  );
};

/**
 * Restores the previous unique incremental id index.
 */
export const down = async () => {
  await startDatabaseForMigration();

  await dropIndexIfExists('draft_1_form_1_resource_1_createdAt_1');
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
