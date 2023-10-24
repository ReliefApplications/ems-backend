import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/** DistributionList type for queries/mutations argument */
export type DistributionListArgs = {
  name: string;
  emails: string[];
};

/** GraphQL distribution list query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DistributionListInputType = new GraphQLInputObjectType({
  name: 'DistributionListInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    emails: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
  }),
});
