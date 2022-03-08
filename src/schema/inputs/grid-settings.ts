import { SortEnumType } from '../../const/enumTypes';
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

// eslint-disable-next-line @typescript-eslint/naming-convention
const RecordsQueryInputType = new GraphQLInputObjectType({
  name: 'RecordsQueryInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
  }),
});

/**
 * GraphQL Input Type of Grid Settings.
 */
const GridSettingsInputType = new GraphQLInputObjectType({
  name: 'GridSettingsInputType',
  fields: () => ({
    query: { type: new GraphQLNonNull(RecordsQueryInputType) },
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    sortField: { type: GraphQLString },
    sortOrder: { type: SortEnumType },
  }),
});

export default GridSettingsInputType;
