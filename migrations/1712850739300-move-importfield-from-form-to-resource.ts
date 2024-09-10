import { DEFAULT_IMPORT_FIELD, Form, Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@lib/logger';
import { isEqual } from 'lodash';

type FormWithImportField = Form & { importField: Resource['importField'] };

/**
 * Update resource, by populating importField with customized form importField
 *
 * @param form form to use to update resource
 */
const updateFormResource = async (form: FormWithImportField) => {
  await Resource.findByIdAndUpdate(form.resource, {
    importField: form.importField,
  });
  form.importField = null;
  await form.save();
  logger.info(`[${form.resource.name}]: updated custom importField.`);
};

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  // Update dashboard pages
  const forms = (await Form.find().select(
    'importField resource'
  )) as FormWithImportField[];

  for (const form of forms) {
    if (
      form.importField &&
      !isEqual(form.importField, DEFAULT_IMPORT_FIELD.incID)
    ) {
      await updateFormResource(form);
    }
  }
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
