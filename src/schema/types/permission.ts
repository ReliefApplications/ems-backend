import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';

/** GraphQL permission type definition */
export const PermissionType = new GraphQLObjectType({
  name: 'Permission',
  fields: () => ({
    id: { type: GraphQLID },
    type: { type: GraphQLString },
    global: { type: GraphQLBoolean },
  }),
});
