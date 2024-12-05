import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql';
import { Connection } from './pagination.type';

/**
 * GraphQL type definition for an Activity Log entry.
 */
export const ActivityLogsByUrlType = new GraphQLObjectType({
  name: 'ActivityLogsByUrl',
  description: 'Represents how many times an url was accessed.',
  fields: () => ({
    url: {
      type: GraphQLString,
      description: 'The URL associated with the activity',
    },
    count: {
      type: GraphQLInt,
      description: 'How many times the URL was accessed',
    },
  }),
});

/** GraphQL activity log connection type definition */
export const ActivityLogsByUrlConnectionType = Connection(
  ActivityLogsByUrlType
);
