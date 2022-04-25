import {
  extendSchema,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
import getTypes from './getTypes';
// import getFilterTypes, { getGraphQLFilterTypeName } from './getFilterTypes';
import getMetaTypes, {
  getGraphQLAllMetaQueryName,
  getGraphQLMetaTypeName,
} from './getMetaTypes';
import { getRelatedType } from './getTypeFromKey';
import { isRelationshipField } from './isRelationshipField';
import getConnectionTypes, {
  getGraphQLConnectionTypeName,
} from './getConnectionType';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from 'models';
import { NameExtension } from './getFieldName';

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
    obj[x._id] = x.name;
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
  const refDataTypes = referenceDatas.map(
    (x) =>
      new GraphQLObjectType({
        name: x.name,
        fields: x.fields.reduce((o: any, field) => {
          o[field] = { type: GraphQLString };
          return o;
        }, {}),
      })
  );
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
          },
        };
        // === MULTI ENTITIES ===
        o[getGraphQLAllEntitiesQueryName(x.name)] = {
          type: connectionTypesByName[getGraphQLConnectionTypeName(x.name)],
          args: {
            first: { type: GraphQLInt },
            afterCursor: { type: GraphQLID },
            skip: { type: GraphQLInt },
            sortField: { type: GraphQLString },
            sortOrder: { type: GraphQLString },
            filter: { type: GraphQLJSON },
            display: { type: GraphQLBoolean },
            styles: { type: GraphQLJSON },
            // filter: { type: filterTypesByName[getGraphQLFilterTypeName(x.name)] },
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
          type: refDatatypesByName[x.name],
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
          f.type.toString() === GraphQLList(GraphQLID).toString()) &&
        isRelationshipField(f.name)
    );

    // Extend schema for each field
    for (const field of fieldsToExtend) {
      const structureField = fieldsByName[x.toString()].find(
        (y) =>
          y.name ===
          field.name.substr(
            0,
            field.name.length -
              (field.name.endsWith(NameExtension.resource) ? 3 : 4)
          )
      );
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
        if (glRelatedField) {
          const key = `${glRelatedField}.${glField}`;
          if (field.type === GraphQLID) {
            o += `extend type ${x} { ${glField}: ${glRelatedType} }`;
          } else {
            o += `extend type ${x} { ${glField}(filter: JSON, sortField: String, sortOrder: String): [${glRelatedType}] }`;
          }
          o += `extend type ${metaName} { ${glField}: ${glRelatedMetaType} }`;
          if (!extendedFields.includes(key)) {
            o += `extend type ${glRelatedType} { ${glRelatedField}(filter: JSON, sortField: String, sortOrder: String): [${x}] }
                          extend type ${glRelatedMetaType} { ${glRelatedField}: ${metaName} }`;
          }
          extendedFields.push(key);
        } else {
          console.log(
            `Missing related name for field "${
              structureField.name
            }" of type "${x.toString()}"`
          );
        }
      } else {
        console.log('ADD REF DATA EXTENSION');
        const glRelatedType = refDataNamesById[structureField.referenceData.id];
        const glField = structureField.name;
        o += `extend type ${x} { ${glField}: ${glRelatedType} }`;
      }
    }
    return o;
  }, '');

  // === COMPLETE SCHEMA ===
  return schemaExtension
    ? extendSchema(schema, parse(schemaExtension))
    : schema;
};
