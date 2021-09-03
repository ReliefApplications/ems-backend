import { extendSchema, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { pluralize, camelize } from 'inflection';
import getFilterTypes from './getFilterTypes';
import getMetaTypes from './getMetaTypes';
import { getRelatedType, getRelatedTypeName } from './getTypeFromKey';
import getTypes from './getTypes';
import { isRelationshipField } from './isRelationshipField';

/**
 * Build the schema definition from the active forms / resources.
 * @param fieldsByName fields of structures with name as key.
 * @param namesById names of structures with id as key.
 * @returns GraphQL schema from active forms / resources.
 */
export const getSchema = (fieldsByName: any, namesById: any) => {

    // Get the types definition
    const types = getTypes(fieldsByName);

    console.log(types);

    // tslint:disable-next-line: no-shadowed-variable
    const typesByName = types.reduce((types, type) => {
        types[type.name] = type;
        return types;
    }, {});

    const filterTypesByName = getFilterTypes(fieldsByName);

    const metaTypes = getMetaTypes(fieldsByName);

    // tslint:disable-next-line: no-shadowed-variable
    const metaTypesByName = metaTypes.reduce((metaTypes, type) => {
        metaTypes[type.name] = type;
        return metaTypes;
    }, {});

    const queryType = new GraphQLObjectType({
        name: 'Query',
        fields: types.reduce((fields, type) => {
            fields[type.name] = {
                type: typesByName[type.name],
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                }
            };
            fields[`all${camelize(pluralize(type.name))}`] = {
                type: new GraphQLList(typesByName[type.name]),
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    sortField: { type: GraphQLString },
                    sortOrder: { type: GraphQLString },
                    filter: { type: filterTypesByName[type.name] },
                }
            };
            fields[`_${type.name}Meta`] = {
                type: metaTypesByName[`_${type.name}Meta`],
                args: {}
            };
            fields[`_all${camelize(pluralize(type.name))}Meta`] = {
                type: metaTypesByName[`_${type.name}Meta`],
                args: {}
            };
            return fields;
        }, {}),
    });

    // Create schema without links between types
    const schema = new GraphQLSchema({
        query: queryType,
        mutation: null,
    });

    // Create links between types
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

    return schemaExtension
        ? extendSchema(schema, parse(schemaExtension))
        : schema;
}
