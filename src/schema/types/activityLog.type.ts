import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';

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
      description: 'The ID of the user who performed the activity.',
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
  }),
});
