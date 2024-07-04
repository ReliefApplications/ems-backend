import { GraphQLInputObjectType, GraphQLString, GraphQLBoolean } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** PositionAttribute type for queries/mutations argument */
export type FilterArgs = {
  variant?: string;
  show?: boolean;
  closable?: boolean;
  structure?: any;
  position?: string;
  keepPrevious?: boolean;
};

/** GraphQL position attribute input type definition */
export const DashboardFilterInputType = new GraphQLInputObjectType({
  name: 'DashboardFilterInputType',
  fields: () => ({
    variant: { type: GraphQLString },
    show: { type: GraphQLBoolean },
    closable: { type: GraphQLBoolean },
    structure: { type: GraphQLJSON },
    position: { type: GraphQLString },
    keepPrevious: { type: GraphQLBoolean },
  }),
});
