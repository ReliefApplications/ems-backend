import { User } from '@models';
import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL type definition for an Activity Log entry.
 */
export const ActivityLogType = new GraphQLObjectType({
  name: 'Activity',
  description: 'Represents a single activity log entry.',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'Unique identifier for the activity log entry.',
    },
    userId: {
      type: GraphQLString,
      description: 'Id of user',
    },
    eventType: {
      type: GraphQLString,
      description: 'Type of the event (e.g., "login", "logout").',
    },
    url: {
      type: GraphQLString,
      description: 'The URL associated with the activity, if applicable.',
      resolve: ({ metadata }) => {
        try {
          const parsedMetadata =
            typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
          return parsedMetadata?.url || '';
        } catch {
          return '';
        }
      },
    },
    metadata: {
      type: GraphQLString,
      description:
        'Additional metadata related to the activity in JSON string format.',
      resolve: ({ metadata }) =>
        typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    },
    username: {
      type: GraphQLString,
      description: 'Email of user',
      resolve: async ({ userId }) => {
        try {
          const { username } = await User.findById(userId).select('username');
          return username || '';
        } catch {
          return '';
        }
      },
    },
    attributes: {
      type: GraphQLJSON,
      description: 'User attributes',
    },
  }),
});
