import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';

/** GraphQL Input Type of State */
const StateInputType = new GraphQLInputObjectType({
  name: 'StateInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    id: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

export default StateInputType;
