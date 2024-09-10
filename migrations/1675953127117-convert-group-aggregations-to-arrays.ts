import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '../src/lib/logger';
import { Resource } from '@models';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  try {
    const resources = await Resource.find().select('name aggregations');

    for (const resource of resources) {
      let resourceHasChanges = false;
      // Check if resource has aggregations
      if (resource.aggregations && resource.aggregations.length > 0) {
        for (const aggregation of resource.aggregations) {
          for (const step of aggregation.pipeline) {
            if (step.type === 'group') {
              // Check if it's stored the old way and change it if needed
              if (typeof step.form.groupBy === 'string') {
                step.form.groupBy = [
                  {
                    field: step.form.groupBy,
                    expression: step.form.groupByExpression,
                  },
                ];
                resourceHasChanges = true;
                logger.info(
                  'Update aggregation ' +
                    aggregation.name +
                    ' from resource ' +
                    resource.name
                );
              }
            }
          }
        }
      }
      if (resourceHasChanges) {
        resource.markModified('aggregations');
        resource.save();
      } else {
        logger.info('Skipped resource ' + resource.name);
      }
    }
  } catch (err) {
    logger.error('migrateAggregations catch error ==>> ', err);
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
