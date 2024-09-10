import { DEFAULT_INCREMENTAL_ID_SHAPE, Form, Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@lib/logger';
import { isEqual } from 'lodash';
import { updateIncrementalIds } from '@utils/form';

type FormWithIdShape = Form & { idShape: Resource['idShape'] };

/**
 * Update resource, by populating idShape with customized form idShape
 *
 * @param form form to use to update resource
 */
const updateFormResource = async (form: FormWithIdShape) => {
  await Resource.findByIdAndUpdate(form.resource, {
    idShape: form.idShape,
  });
  form.idShape = null;
  await form.save();
  logger.info(`[${form.resource.name}]: updated custom idShape.`);
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
    'idShape resource'
  )) as FormWithIdShape[];

  const updatedResources: string[] = [];

  for (const form of forms) {
    if (form.idShape && !isEqual(form.idShape, DEFAULT_INCREMENTAL_ID_SHAPE)) {
      await updateFormResource(form);
      if (!updatedResources.includes(form.resource.toString())) {
        await updateIncrementalIds(form.resource, form.idShape, true);
        updatedResources.push(form.resource.toString());
      }
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
