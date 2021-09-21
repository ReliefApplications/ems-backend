import { extendSchema, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
import getTypes from './getTypes';
import getFilterTypes, { getGraphQLFilterTypeName } from './getFilterTypes';
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
 * Transform a string into a GraphQL All Entities field name.
 * @param name GraphQL name of form / resource.
 * @returns name of new GraphQL all entities field.
 */
 const getGraphQLAllEntitiesFieldName = (name: string) => {
    return pluralize(name);
}

/**
 * Build the schema definition from the active forms / resources.
 * @param structures definition of forms / resources.
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
            [x.name]: x
        }
    }, {});

    // === FILTER TYPES ===
    const filterTypes = getFilterTypes(structures);
    const filterTypesByName = filterTypes.reduce((o, x) => {
        return {
            ...o,
            [x.name]: x
        }
    }, {});

    // === META TYPES ===
    const metaTypes = getMetaTypes(structures);
    const metaTypesByName = metaTypes.reduce((o, x) => {
        return {
            ...o,
            [x.name]: x
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
                type: new GraphQLObjectType({
                    name: `${getGraphQLAllEntitiesQueryName(x.name)}Type`,
                    fields: () => ({
                        result: {
                            type: new GraphQLList(typesByName[x.name]),
                        },
                        count: { type: GraphQLInt }                        
                    })
                }),
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    sortField: { type: GraphQLString },
                    sortOrder: { type: GraphQLString },
                    filter: { type: filterTypesByName[getGraphQLFilterTypeName(x.name)] },
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
    const schemaExtension: any = types.reduce((o, x) => {
        const pluralName = getGraphQLAllEntitiesFieldName(x.toString());
        const metaName = getGraphQLMetaTypeName(x.toString());
        const filterType = getGraphQLFilterTypeName(x.name);

        // List fields to extend
        const fieldsToExtend = Object.values(x.getFields()).filter(f => 
            (f.type === GraphQLID || f.type.toString() === GraphQLList(GraphQLID).toString()) &&
            isRelationshipField(f.name)
        );

        // Extend schema for each field
        for (const field of fieldsToExtend) {
            const glRelatedType = getRelatedType(field.name, fieldsByName[x.toString()], namesById);
            const glRelatedMetaType = getGraphQLMetaTypeName(glRelatedType);
            const glField = getRelatedTypeName(field.name);
            const glFieldFilterType = getGraphQLFilterTypeName(glRelatedType);

            if (field.type === GraphQLID) {
                o += `extend type ${x} { ${glField}: ${glRelatedType} }`;
            } else {
                o += `extend type ${x} { ${glField}(filter: ${glFieldFilterType}, sortField: String, sortOrder: String): [${glRelatedType}] }`
            }
            o += `extend type ${glRelatedType} { ${pluralName}(filter: ${filterType}, sortField: String, sortOrder: String): [${x}] }
                extend type ${metaName} { ${glField}: ${glRelatedMetaType} }
                extend type ${glRelatedMetaType} { ${pluralName}: ${metaName} }`;
        }
        return o;
    }, '');

    // === COMPLETE SCHEMA ===
    return schemaExtension
        ? extendSchema(schema, parse(schemaExtension))
        : schema;
}
