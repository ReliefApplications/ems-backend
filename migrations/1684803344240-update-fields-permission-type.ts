import { Types } from 'mongoose';
import { logger } from '@lib/logger';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Resource } from '@models';
import { cloneDeep, isEqual } from 'lodash';

/**
 * Checks the canSee / canUpdate permissions of each field on each resource
 * If it is a string, it will be converted to an ObjectId
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find();
  const initResources = cloneDeep(resources);
  for (const resource of resources) {
    const fields = resource.fields;

    const newFields = fields.map((field) => {
      return {
        ...field,
        permissions: {
          canSee: (field.permissions?.canSee || []).map((perm) =>
            typeof perm === 'string' ? new Types.ObjectId(perm) : perm
          ),
          canUpdate: (field.permissions?.canUpdate || []).map((perm) =>
            typeof perm === 'string' ? new Types.ObjectId(perm) : perm
          ),
        },
      } as typeof field;
    });

    resource.fields = newFields;
  }

  try {
    if (!isEqual(initResources, resources)) {
      logger.info('Updating permissions types on resource fields');
      await Promise.all(resources.map((resource) => resource.save()));
    }
  } catch (e) {
    logger.error('Error trying to save new resource types', e);
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
