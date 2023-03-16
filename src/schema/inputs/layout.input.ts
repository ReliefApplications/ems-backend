import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL layout query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayoutQueryInputType = new GraphQLInputObjectType({
  name: 'LayoutQueryInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    template: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    pageSize: { type: new GraphQLNonNull(GraphQLInt) },
    fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
    sort: { type: GraphQLJSON },
    style: { type: new GraphQLList(GraphQLJSON) },
  }),
});

/** GraphQL layout display inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayoutDisplayInputType = new GraphQLInputObjectType({
  name: 'LayoutDisplayInputType',
  fields: () => ({
    filter: { type: GraphQLJSON },
    fields: { type: GraphQLJSON },
    sort: { type: GraphQLJSON },
    showFilter: { type: GraphQLBoolean },
  }),
});

/** GraphQL Input Type of Layout */
const LayoutInputType = new GraphQLInputObjectType({
  name: 'LayoutInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    query: { type: new GraphQLNonNull(LayoutQueryInputType) },
    display: { type: new GraphQLNonNull(LayoutDisplayInputType) },
  }),
});

export default LayoutInputType;
