import { ActivityLog } from '@models';
import { ActivityLogType } from '../types';
import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { logger } from '@services/logger.service';

/**
 * GraphQL query an especific activity log
 */
export default {
  type: ActivityLogType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent: any, args: { id: string }) {
    try {
      const activity = await ActivityLog.findById(args.id);
      if (!activity) {
        throw new GraphQLError('Activity log not found');
      }
      return activity;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError('Error');
    }
  },
};
