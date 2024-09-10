import { Form, Record, Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { deleteFolder } from '@utils/files/deleteFolder';
import { logger } from '@lib/logger';

/** This migration removes forms that are not linked to any resources */
export const up = async () => {
  await startDatabaseForMigration();

  const forms = await Form.find({});
  const resources = await Resource.find({});

  const formsToDelete = forms.filter(
    (f) => !resources.find((r) => r._id.equals(f.resource))
  );

  try {
    for (const form of forms) {
      await deleteFolder('forms', form.id || form._id);
      logger.info(`Files from form ${form.id} successfully removed.`);
    }
  } catch (err) {
    logger.error(`Deletion of files from forms failed: ${err.message}`);
  }

  // delete and log how many forms were deleted
  const { deletedCount } = await Form.deleteMany({
    _id: { $in: formsToDelete.map((f) => f._id) },
  });
  logger.info(`${deletedCount} forms were deleted.`);

  // delete records that are linked to the deleted forms and log how many were deleted
  const { deletedCount: deletedRecordsCount } = await Record.deleteMany({
    form: { $in: formsToDelete.map((f) => f._id) },
  });
  logger.info(`${deletedRecordsCount} records were deleted.`);
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
