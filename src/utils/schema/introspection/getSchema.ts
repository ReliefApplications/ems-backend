import {
  extendSchema,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
} from 'graphql';
import { pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
import getTypes, { getReferenceDatasTypes } from './getTypes';
// import getFilterTypes, { getGraphQLFilterTypeName } from './getFilterTypes';
import getMetaTypes, {
  getGraphQLAllMetaQueryName,
  getGraphQLMetaTypeName,
  getReferenceDataMetaTypes,
} from './getMetaTypes';
import { getRelatedType } from './getTypeFromKey';
import { isRelationshipField } from './isRelationshipField';
import getConnectionTypes, {
  getGraphQLConnectionTypeName,
} from './getConnectionType';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
import { NameExtension } from './getFieldName';
import { logger } from '@lib/logger';
import { GraphQLDate } from 'graphql-scalars';

/**
 * Transform a string into a GraphQL All Entities query name.
 *
 * @param name GraphQL name of form / resource.
 * @returns name of new GraphQL all entities query.
 */
const getGraphQLAllEntitiesQueryName = (name: string) => {
  return 'all' + pluralize(name);
};

/**
 * Build the schema definition from the active forms / resources.
 *
 * @param structures definition of forms / resources.
 * @param referenceDatas definition of referenceDatas.
 * @returns GraphQL schema from active forms / resources.
 */
export const getSchema = (
  structures: SchemaStructure[],
  referenceDatas: ReferenceData[]
) => {
  const fieldsByName: any = structures.reduce((obj, x) => {
    obj[x.name] = x.fields;
    return obj;
  }, {});

  const namesById: any = structures.reduce((obj, x) => {
    obj[x._id.toString()] = x.name;
    return obj;
  }, {});

  // === TYPES ===
  const types = getTypes(structures);
  const typesByName = types.reduce((o, x) => {
    return {
      ...o,
      [x.name]: x,
    };
  }, {});

  // === REFERENCE DATA TYPES ===
  const refDataTypes = getReferenceDatasTypes(referenceDatas);
  const refDatatypesByName = refDataTypes.reduce((o, x) => {
    return {
      ...o,
      [x.name]: x,
    };
  }, {});
  const refDataNamesById = referenceDatas.reduce((obj, x) => {
    obj[x._id] = x.name;
    return obj;
  }, {});
  const metaRefDataTypes = getReferenceDataMetaTypes(referenceDatas);
  const metaRefDataTypesByName = metaRefDataTypes.reduce((o, x) => {
    return {
      ...o,
      [x.name]: x,
    };
  }, {});

  // === FILTER TYPES ===
  // const filterTypes = getFilterTypes(structures);
  // const filterTypesByName = filterTypes.reduce((o, x) => {
  //     return {
  //         ...o,
  //         [x.name]: x
  //     }
  // }, {});

  // === META TYPES ===
  const metaTypes = getMetaTypes(structures);
  const metaTypesByName = metaTypes.reduce((o, x) => {
    return {
      ...o,
      [x.name]: x,
    };
  }, {});

  // === CONNECTION TYPES ===
  const connectionTypes = getConnectionTypes(types);
  const connectionTypesByName = connectionTypes.reduce((o, x) => {
    return {
      ...o,
      [x.name]: x,
    };
  }, {});

  // === QUERY TYPE ===
  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      ...types.reduce((o, x) => {
        // === SINGLE ENTITY ===
        o[x.name] = {
          type: typesByName[x.name],
          args: {
            id: { type: new GraphQLNonNull(GraphQLID) },
            display: { type: GraphQLBoolean },
            data: { type: GraphQLJSON },
          },
        };
        // === MULTI ENTITIES ===
        o[getGraphQLAllEntitiesQueryName(x.name)] = {
          type: connectionTypesByName[getGraphQLConnectionTypeName(x.name)],
          args: {
            first: { type: GraphQLInt },
            afterCursor: { type: GraphQLID },
            skip: { type: GraphQLInt },
            sort: { type: GraphQLJSON },
            filter: { type: GraphQLJSON },
            contextFilters: { type: GraphQLJSON },
            display: { type: GraphQLBoolean },
            styles: { type: GraphQLJSON },
            at: { type: GraphQLDate },
          },
        };
        // === META ===
        o[getGraphQLMetaTypeName(x.name)] = {
          type: metaTypesByName[getGraphQLMetaTypeName(x.name)],
          args: {},
        };
        // === MULTI META ===
        o[getGraphQLAllMetaQueryName(x.name)] = {
          type: metaTypesByName[getGraphQLMetaTypeName(x.name)],
          args: {},
        };
        return o;
      }, {}),
      ...refDataTypes.reduce((o, x) => {
        o[x.name] = {
          type: new GraphQLList(refDatatypesByName[x.name]),
          args: {},
        };
        return o;
      }, {}),
      ...metaRefDataTypes.reduce((o, x) => {
        o[x.name] = {
          type: metaRefDataTypesByName[x.name],
          args: {},
        };
        return o;
      }, {}),
    },
  });

  // === SCHEMA WITHOUT LINKS BETWEEN ENTITIES ===
  const schema = new GraphQLSchema({
    query: queryType,
    mutation: null,
  });

  const extendedFields = [];

  // === EXTENDS SCHEMA WITH ENTITIES RELATIONS ===
  const schemaExtension: any = types.reduce((o, x) => {
    const metaName = getGraphQLMetaTypeName(x.toString());
    // const filterType = getGraphQLFilterTypeName(x.name);

    // List fields to extend
    const fieldsToExtend = Object.values(x.getFields()).filter(
      (f) =>
        (f.type === GraphQLID ||
          f.type.toString() === new GraphQLList(GraphQLID).toString()) &&
        isRelationshipField(f.name)
    );

    // Extend schema for each field
    for (const field of fieldsToExtend) {
      const structureField = fieldsByName[x.toString()].find(
        (y) =>
          y.name ===
          field.name.slice(
            0,
            field.name.length -
              (field.name.endsWith(NameExtension.resource) ? 3 : 4)
          )
      );
      if (structureField) {
        if (!field.name.endsWith(NameExtension.referenceData)) {
          const glRelatedType = getRelatedType(
            field.name,
            fieldsByName[x.toString()],
            namesById
          );
          const glRelatedMetaType = getGraphQLMetaTypeName(glRelatedType);
          const glField = structureField.name;
          const glRelatedField = structureField.relatedName;
          // const glFieldFilterType = getGraphQLFilterTypeName(glRelatedType);
          if (glRelatedField && glRelatedType) {
            const key = `${glRelatedField}.${glField}`;
            if (field.type === GraphQLID) {
              o += `extend type ${x} { ${glField}: ${glRelatedType} }`;
            } else {
              o += `extend type ${x} { ${glField}(filter: JSON, sortField: String, sortOrder: String, first: Int): [${glRelatedType}] }`;
            }
            o += `extend type ${metaName} { ${glField}: ${glRelatedMetaType} }`;
            if (!extendedFields.includes(key)) {
              o += `extend type ${glRelatedType} { ${glRelatedField}(filter: JSON, sortField: String, sortOrder: String, first: Int): [${x}] }
                            extend type ${glRelatedMetaType} { ${glRelatedField}: ${metaName} }`;
            }
            extendedFields.push(key);
          } else {
            logger.info(
              `Missing related name for field "${
                structureField.name
              }" of type "${x.toString()}"`
            );
          }
        } else {
          const glRelatedType =
            refDataNamesById[structureField.referenceData.id];
          const glRelatedMetaType = getGraphQLMetaTypeName(glRelatedType);
          const glField = structureField.name;
          if (glRelatedType) {
            if (field.type === GraphQLID) {
              o += `extend type ${x} { ${glField}: ${glRelatedType} }`;
            } else {
              o += `extend type ${x} { ${glField}(filter: JSON, sortField: String, sortOrder: String, first: Int): [${glRelatedType}] }`;
            }
            o += `extend type ${metaName} { ${glField}: ${glRelatedMetaType} }`;
          }
        }
      }
    }
    return o;
  }, '');

  // === COMPLETE SCHEMA ===
  return schemaExtension
    ? extendSchema(schema, parse(schemaExtension))
    : schema;
};
