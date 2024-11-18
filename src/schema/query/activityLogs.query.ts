import { ActivityLog } from '@models';
import { ActivityLogType } from '../types';
import { GraphQLError, GraphQLList } from 'graphql';
import { logger } from '@services/logger.service';

/**
 * GraphQL query to list all activitiesLogs.
 */
export default {
  type: new GraphQLList(ActivityLogType),
  async resolve() {
    try {
      const activities = await ActivityLog.find();
      return activities;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError('Error');
    }
  },
};
