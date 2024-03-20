import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** Template type for queries/mutations argument */
export type TemplateArgs = {
  name: string;
  type: string;
  content: any;
};

/** GraphQL template query input type definition */
export const TemplateInputType = new GraphQLInputObjectType({
  name: 'TemplateInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLJSON) },
  }),
});
