import { GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType } from 'graphql';
import { Edge, PageInfo } from '../../../schema/types';

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
      _source: { type: GraphQLID },
    }),
  });
};

/**
 * Gets the name for the GraphQL connection
 *
 * @param name Entity
 * @returns The name for the GraphQL connection
 */
export const getGraphQLConnectionTypeName = (name: string) => {
  return name + 'Connection';
};

/**
 * Gets an Array of connection GraphQL types
 *
 * @param types An array of connection objects
 * @returns The array of GraphQL connection types
 */
const getConnectionTypes = (types: any[]) => {
  return types.map((x) => {
    return Connection(x);
  });
};

export default getConnectionTypes;
