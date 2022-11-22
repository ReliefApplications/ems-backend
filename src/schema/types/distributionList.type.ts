import {
  GraphQLID,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';

/**
 * GraphQL DistributionList type.
 */
export const DistributionListType = new GraphQLObjectType({
  name: 'DistributionList',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    emails: { type: new GraphQLList(GraphQLString) },
  }),
});
