import { GraphQLObjectType } from 'graphql';
import { SchemaStructure } from '../getStructures';
import { getMetaFields } from './getFields';
import { pluralize } from 'inflection';
import { ReferenceData } from '@models';
import GraphQLJSON from 'graphql-type-json';

/**
 * Transform a string into a GraphQL meta type name.
 *
 * @param name GraphQL name of form / resource.
 * @returns name of the GraphQL filter meta type.
 */
export const getGraphQLMetaTypeName = (name: string) => {
  return '_' + name + 'Meta';
};

/**
 * Transform a string into a GraphQL All Entities meta query name.
 *
 * @param name GraphQL name of form / resource.
 * @returns name of new GraphQL all entities meta query.
 */
export const getGraphQLAllMetaQueryName = (name: string) => {
  return '_all' + pluralize(name) + 'Meta';
};

/**
 * Get GraphQL meta types from the structures.
 *
 * @param structures definition of forms / resources structures.
 * @returns array of GraphQL meta types of the structures.
 */
const getMetaTypes = (structures: SchemaStructure[]) => {
  return structures.map(
    (x) =>
      new GraphQLObjectType({
        name: getGraphQLMetaTypeName(x.name),
        fields: getMetaFields(x.fields),
      })
  );
};

/**
 * Get GraphQL meta types from reference datas.
 *
 * @param referenceDatas list of all referenceDatas
 * @returns array of GraphQL meta types of the referenceDatas.
 */
export const getReferenceDataMetaTypes = (referenceDatas: ReferenceData[]) => {
  return referenceDatas.map(
    (x) =>
      new GraphQLObjectType({
        name: getGraphQLMetaTypeName(x.name),
        fields: x.fields.reduce(
          (o, field: string) =>
            Object.assign(o, {
              [field]: { type: GraphQLJSON },
            }),
          {}
        ),
      })
  );
};

export default getMetaTypes;
