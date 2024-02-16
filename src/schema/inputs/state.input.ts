import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL Input Type of State */
const StateInputType = new GraphQLInputObjectType({
  name: 'StateInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: new GraphQLNonNull(GraphQLJSON) },
    id: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

export default StateInputType;
