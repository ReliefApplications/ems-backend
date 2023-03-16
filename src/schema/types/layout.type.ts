import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';

/**
 * GraphQL Layout type.
 */
export const LayoutType = new GraphQLObjectType({
  name: 'Layout',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    query: { type: GraphQLJSON },
    display: { type: GraphQLJSON },
  }),
});

/** GraphQL layout connection type definition */
export const LayoutConnectionType = Connection(LayoutType);
