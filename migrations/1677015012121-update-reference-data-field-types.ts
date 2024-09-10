import { ReferenceData } from '@models';
import { logger } from '@lib/logger';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  const updates: any[] = [];
  const allRefIds = await ReferenceData.find({});
  allRefIds.forEach((ref) => {
    logger.info(`Updating reference data ${ref.name}`);
    // old fields are strings, new fields are objects
    const oldFields: unknown[] = ref.fields as any;
    const newFields: ReferenceData['fields'] = oldFields.map((field) => {
      if (typeof field === 'string') {
        return {
          name: field,
          type: 'string',
          graphQLFieldName: ReferenceData.getGraphQLFieldName(field),
        };
      } else if (
        typeof field === 'object' &&
        'name' in field &&
        'type' in field
      ) {
        const fieldAsObject = field as { name: string; type: string };
        return {
          name: fieldAsObject.name,
          graphQLFieldName: ReferenceData.getGraphQLFieldName(
            fieldAsObject.name
          ),
          type: fieldAsObject.type,
        };
      } else {
        throw new Error(`Invalid field for ${ref.name}: ${field}`);
      }
    }) as ReferenceData['fields'];

    updates.push({
      updateOne: {
        filter: { _id: ref._id },
        update: {
          $set: {
            fields: newFields,
          },
        },
      },
    });
  });
  if (updates.length > 0) await ReferenceData.bulkWrite(updates);
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
