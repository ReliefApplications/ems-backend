import {
  GraphQLInt,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
/**
 * Gets the GraphQL edge type definition
 *
 * @param itemType edge type
 * @returns GraphQL edge type definition
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Edge = (itemType: any) => {
  return new GraphQLObjectType({
    name: `${itemType.name}Edge`,
    fields: () => ({
      node: { type: itemType },
      cursor: { type: new GraphQLNonNull(GraphQLID) },
      meta: { type: GraphQLJSON },
    }),
  });
};

/** GraphQL page info type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PageInfo = new GraphQLObjectType({
  name: 'PageInfo',
  fields: () => ({
    startCursor: { type: GraphQLID },
    endCursor: { type: GraphQLID },
    hasNextPage: { type: GraphQLBoolean },
  }),
});

/**
 * Encodes a node
 *
 * @param field field to be encoded
 * @returns the encoded cursor
 */
export const encodeCursor = (field: any) => {
  return Buffer.from(field, 'binary').toString('base64');
};

/**
 * Decodes a node
 *
 * @param cursor a cursos
 * @returns the decoded cursor
 */
export const decodeCursor = (cursor: string) => {
  return Buffer.from(cursor, 'base64').toString('binary');
};

/**
 * Gets the GraphQL connection type definition for a given element type
 *
 * @param itemType the element type
 * @returns GraphQL connection type definition
 */
export const Connection = (itemType: any) => {
  return new GraphQLObjectType({
    name: `${itemType.name}Connection`,
    fields: () => ({
      totalCount: { type: GraphQLInt },
      edges: { type: new GraphQLList(Edge(itemType)) },
      pageInfo: { type: PageInfo },
    }),
  });
};
