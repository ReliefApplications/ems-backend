import { Connection } from '../../../schema/types';

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
