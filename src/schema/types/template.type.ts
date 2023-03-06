import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL Template type.
 */
export const TemplateType = new GraphQLObjectType({
  name: 'Template',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    content: { type: GraphQLJSON },
  }),
});
