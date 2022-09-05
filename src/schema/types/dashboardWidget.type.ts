import {
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL Dashboard Widget type.
 */
export const DashboardWidgetType = new GraphQLObjectType({
  name: 'DashboardWidget',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    defaultCols: { type: GraphQLInt },
    defaultRows: { type: GraphQLInt },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    settings: { type: GraphQLJSON },
  }),
});
