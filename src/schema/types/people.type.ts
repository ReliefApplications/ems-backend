import { GraphQLObjectType, GraphQLID, GraphQLString } from 'graphql';
import { Connection } from './pagination.type';

/**
 * GraphQL User type.
 */
export const PeopleType = new GraphQLObjectType({
  name: 'People',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    emailaddress: { type: GraphQLString },
    firstname: { type: GraphQLString },
    lastname: { type: GraphQLString },
    oid: { type: GraphQLString },
  }),
});

/** User connection type */
export const UserConnectionType = Connection(PeopleType);
