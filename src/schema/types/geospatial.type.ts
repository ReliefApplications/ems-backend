import { GraphQLObjectType } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { GeospatialEnumType } from '@const/enumTypes';

/** GraphQL GeoSpatial type definition */
export const GeospatialType = new GraphQLObjectType({
  name: 'Geospatial',
  fields: () => ({
    type: { type: GeospatialEnumType },
    coordinates: { type: GraphQLJSON },
  }),
});
