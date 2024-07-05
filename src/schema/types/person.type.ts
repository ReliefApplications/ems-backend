import { GraphQLObjectType, GraphQLString } from 'graphql';

/**
 * GraphQL Person type.
 */
export const PersonType = new GraphQLObjectType({
  name: 'Person',
  fields: () => ({
    id: { type: GraphQLString },
    firstname: { type: GraphQLString },
    lastname: { type: GraphQLString },
    emailaddress: { type: GraphQLString },
  }),
});
