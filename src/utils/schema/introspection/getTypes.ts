import { GraphQLObjectType, GraphQLString } from 'graphql';
import { ReferenceData } from '@models';
import { SchemaStructure } from '../getStructures';
import { getFields } from './getFields';

/**
 * Get GraphQL types from the structures.
 *
 * @param structures definition of forms / resources structures.
 * @returns array of GraphQL types of the structures.
 */
const getTypes = (structures: SchemaStructure[]) => {
  return structures.map(
    (x) =>
      new GraphQLObjectType({
        name: x.name,
        fields: getFields(x.fields),
      })
  );
};

/**
 * Get GraphQL types from the reference data.
 *
 * @param referenceDatas list of all referenceDatas
 * @returns array of GraphQL types of the referenceDatas.
 */
export const getReferenceDatasTypes = (referenceDatas: ReferenceData[]) =>
  referenceDatas.map(
    (x) =>
      new GraphQLObjectType({
        name: x.name,
        fields: x.fields.reduce((o: any, field) => {
          o[field] = { type: GraphQLString };
          return o;
        }, {}),
      })
  );
export default getTypes;
