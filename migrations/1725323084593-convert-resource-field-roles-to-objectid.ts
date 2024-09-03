import { Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import mongoose from 'mongoose';
import { logger } from '@services/logger.service';

/**
 * Convert a value ( string or mongo object id ) to mongo object id.
 *
 * @param value value to transform
 * @returns value as mongo object id
 */
const convertToObjectId = (value) => {
  // Only convert if value is a valid ObjectId string
  if (mongoose.Types.ObjectId.isValid(value) && typeof value === 'string') {
    return new mongoose.Types.ObjectId(value);
  }
  return value; // Return original if it's not a valid string ObjectId
};

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  console.log('oua oua');
  await startDatabaseForMigration();
  try {
    // Find resources where fields.permissions.canSee or fields.permissions.canUpdate contain strings
    const resources = await Resource.find({
      $or: [
        {
          'fields.permissions.canSee': { $elemMatch: { $type: 'string' } },
        },
        {
          'fields.permissions.canUpdate': { $elemMatch: { $type: 'string' } },
        },
      ],
    });

    // Loop through each resource and update the fields
    for (const resource of resources) {
      let updated = false;

      // Iterate through the fields array
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      resource.fields = resource.fields.map((field) => {
        if (field.name === 'campaign') {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          console.log(field);
        }
        if (field.permissions) {
          // Check and convert canSee strings to ObjectIds
          if (field.permissions.canSee) {
            field.permissions.canSee = field.permissions.canSee.map((perm) => {
              const updatedPerm = convertToObjectId(perm);
              if (updatedPerm !== perm) updated = true;
              return updatedPerm;
            });
          }

          // Check and convert canUpdate strings to ObjectIds
          if (field.permissions.canUpdate) {
            field.permissions.canUpdate = field.permissions.canUpdate.map(
              (perm) => {
                const updatedPerm = convertToObjectId(perm);
                if (updatedPerm !== perm) updated = true;
                return updatedPerm;
              }
            );
          }
        }
        if (field.name === 'campaign') {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          console.log(field);
        }
        return field;
      });

      // Save the resource if any updates were made
      if (updated) {
        resource.markModified('fields');
        await resource.save();
        logger.info(
          `Updated resource ${resource.name} with ID: ${resource._id}`
        );
      }
    }

    logger.info('Completed updating resources.');
  } catch (error) {
    logger.error('Error updating resources:', error);
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
