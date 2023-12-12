import { GraphQLBoolean, GraphQLInputObjectType, GraphQLString } from 'graphql';

/** Page geographic context type for queries/mutations argument */
export type PageGeographicContextArgs = {
  enabled?: boolean;
  region?: string;
  country?: string;
};

/** GraphQL Input Type for the page geographic context */
export const PageGeographicContextInputType = new GraphQLInputObjectType({
  name: 'PageGeographicContextInputType',
  fields: () => ({
    enabled: { type: GraphQLBoolean },
    region: { type: GraphQLString },
    country: { type: GraphQLString },
  }),
});
