import { Activity } from '@models/activity.model';
import { GraphQLList } from 'graphql';
import { ActivityType } from '../types';

/**
 * GraphQL query to list all activities.
 */
export default {
  type: new GraphQLList(ActivityType),
  async resolve(parent: any, args: any, context: any) {
    console.log('ActivityLogsQuery.resolve');
    return Activity.find().sort({ createdAt: -1 });
  },
};
