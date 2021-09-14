import { extendSchema, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
import getTypes from './getTypes';
import getFilterTypes from './getFilterTypes';
import getMetaTypes, { getGraphQLAllMetaQueryName, getGraphQLMetaTypeName } from './getMetaTypes';
import { getRelatedType, getRelatedTypeName } from './getTypeFromKey';
import { isRelationshipField } from './isRelationshipField';

/**
 * Transform a string into a GraphQL All Entities query name.
 * @param name GraphQL name of form / resource.
 * @returns name of new GraphQL all entities query.
 */
const getGraphQLAllEntitiesQueryName = (name: string) => {
    return 'all' + pluralize(name);
}

/**
 * Build the schema definition from the active forms / resources.
 * @param fieldsByName fields of structures with name as key.
 * @param namesById names of structures with id as key.
 * @returns GraphQL schema from active forms / resources.
 */
export const getSchema = (structures: SchemaStructure[]) => {

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
            [o[x.name]]: x
        }
    }, {});

    // === FILTER TYPES ===
    const filterTypes = getFilterTypes(structures);
    const filterTypesByName = filterTypes.reduce((o, x) => {
        return {
            ...o,
            [o[x.name]]: x
        }
    }, {});

    // === META TYPES ===
    const metaTypes = getMetaTypes(structures);
    const metaTypesByName = metaTypes.reduce((o, x) => {
        return {
            ...o,
            [o[x.name]]: x
        }
    }, {});

    // === QUERY TYPE ===
    const queryType = new GraphQLObjectType({
        name: 'Query',
        fields: types.reduce((o, x) => {
            // === SINGLE ENTITY ===
            o[x.name] = {
                type: typesByName[x.name],
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                }
            };
            // === MULTI ENTITIES ===
            o[getGraphQLAllEntitiesQueryName(x.name)] = {
                type: new GraphQLList(typesByName[x.name]),
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    sortField: { type: GraphQLString },
                    sortOrder: { type: GraphQLString },
                    filter: { type: filterTypesByName[x.name] },
                }
            };
            // === META ===
            o[getGraphQLMetaTypeName(x.name)] = {
                type: metaTypesByName[getGraphQLMetaTypeName(x.name)],
                args: {}
            };
            // === MULTI META ===
            o[getGraphQLAllMetaQueryName(x.name)] = {
                type: metaTypesByName[getGraphQLMetaTypeName(x.name)],
                args: {}
            };
            return o;
        }, {}),
    });

    // === SCHEMA WITHOUT LINKS BETWEEN ENTITIES ===
    const schema = new GraphQLSchema({
        query: queryType,
        mutation: null,
    });



    // === EXTENDS SCHEMA WITH ENTITIES RELATIONS ===
    const schemaExtension: any = Object.values(typesByName).reduce((ext, type: any) => {

        const fields = Object.values(type.getFields()).filter((x: any) =>
            (x.type === GraphQLID || x.type.toString() === GraphQLList(GraphQLID).toString()) &&
            isRelationshipField(x.name)).map((x: any) => x.name);

        fields.map((fieldName) => {
            const relType = getRelatedType(fieldName, fieldsByName[type.toString()], namesById);
            const rel = pluralize(type.toString());
            ext += `
    ${fieldName.endsWith('_id') ?
                    `extend type ${type} { ${getRelatedTypeName(fieldName)}: ${relType} }` :
                    `extend type ${type} { ${getRelatedTypeName(fieldName)}(filter: ${filterTypesByName[relType]}, sortField: String, sortOrder: String): [${relType}] }`}
    extend type ${relType} { ${rel}(filter: ${filterTypesByName[type.name]}, sortField: String, sortOrder: String): [${type}] }
    extend type _${type}Meta { ${getRelatedTypeName(fieldName)}: _${relType}Meta }
    extend type _${relType}Meta { ${rel}: _${type}Meta }`;
        });
        return ext;
    }, '');

    console.log(schemaExtension);

    // === COMPLETE SCHEMA ===
    return schemaExtension
        ? extendSchema(schema, parse(schemaExtension))
        : schema;
}
