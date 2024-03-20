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
import { Types } from 'mongoose';

/** LayoutQuery type for queries/mutations argument */
type LayoutQueryArgs = {
  name: string;
  template?: string | Types.ObjectId;
  filter?: any;
  pageSize: number;
  fields: any;
  sort?: any;
  style?: any;
};

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

/** LayoutDisplay type for queries/mutations argument */
type LayoutDisplayArgs = {
  filter?: any;
  fields?: any;
  sort?: any;
  showFilter?: boolean;
};

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

/** LayoutDisplay type for queries/mutations argument */
export type LayoutArgs = {
  name: string;
  query: LayoutQueryArgs;
  display: LayoutDisplayArgs;
};

/** GraphQL Input Type of Layout */
export const LayoutInputType = new GraphQLInputObjectType({
  name: 'LayoutInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    query: { type: new GraphQLNonNull(LayoutQueryInputType) },
    display: { type: new GraphQLNonNull(LayoutDisplayInputType) },
  }),
});
