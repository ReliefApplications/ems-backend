import { GraphQLInputObjectType, GraphQLString, GraphQLBoolean } from 'graphql';

/** PositionAttribute type for queries/mutations argument */
export type FilterArgs = {
  variant?: string;
  show?: boolean;
  closable?: boolean;
};

/** GraphQL position attribute input type definition */
export const DashboardFilterInputType = new GraphQLInputObjectType({
  name: 'DashboardFilterInputType',
  fields: () => ({
    variant: { type: GraphQLString },
    show: { type: GraphQLBoolean },
    closable: { type: GraphQLBoolean },
  }),
});
