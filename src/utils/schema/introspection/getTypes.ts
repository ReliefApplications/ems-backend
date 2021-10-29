import { GraphQLObjectType } from 'graphql';
import { SchemaStructure } from '../getStructures';
import { getFields } from './getFields';

/**
 * Get GraphQL types from the structures.
 * @param structures definition of forms / resources structures.
 * @returns array of GraphQL types of the structures.
 */
const getTypes = (structures: SchemaStructure[]) => {
  return structures.map(x => new GraphQLObjectType({
    name: x.name,
    fields: getFields(x.fields),
  }));
};

export default getTypes;
