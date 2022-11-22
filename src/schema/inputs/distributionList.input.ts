import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/** GraphQL distribution list query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const DistributionListInputType = new GraphQLInputObjectType({
  name: 'DistributionListInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    emails: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
  }),
});

export default DistributionListInputType;
