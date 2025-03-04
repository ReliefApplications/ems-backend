import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { Form, ReferenceData } from '../src/models';
import { logger } from '../src/services/logger.service';

/** Migration description */
export const description =
  'Add graphql type names to form & reference data objects';

/**
 * Use to graphqltypenames migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const forms = await Form.find({ graphQLTypeName: { $exists: false } }).select(
    'name'
  );
  for (const form of forms) {
    await form.updateOne({
      graphQLTypeName: Form.getGraphQLTypeName(form.name),
    });
  }

  // update reference data
  const referenceDatas = await ReferenceData.find({
    graphQLTypeName: { $exists: false },
  }).select('name');
  for (const referenceData of referenceDatas) {
    await referenceData.updateOne({
      graphQLTypeName: ReferenceData.getGraphQLTypeName(referenceData.name),
    });
  }

  logger.info('\nMigration complete');
};

/**
 * Use to graphqltypenames migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
