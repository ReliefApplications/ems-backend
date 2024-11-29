import { ActivityLog } from '@models';
import { ActivityLogType } from '../types';
import { GraphQLError, GraphQLList, GraphQLString } from 'graphql';
import { logger } from '@services/logger.service';

/**
 * GraphQL query to list all activitiesLogs.
 */
export default {
  type: new GraphQLList(ActivityLogType),
  args: {
    userId: { type: GraphQLString },
    applicationId: { type: GraphQLString },
  },
  async resolve(_, args) {
    try {
      const { userId, applicationId } = args;

      const queryConditions: { [key: string]: string | undefined } = {};
      if (userId) queryConditions.userId = userId;
      if (applicationId) queryConditions.applicationId = applicationId;

      const activities = await ActivityLog.find(queryConditions).sort({
        createdAt: -1,
      });
      return activities;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError('Error');
    }
  },
};
