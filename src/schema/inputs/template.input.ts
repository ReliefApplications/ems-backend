import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL template query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const TemplateInputType = new GraphQLInputObjectType({
  name: 'TemplateInputType',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLJSON) },
  }),
});

export default TemplateInputType;
