import {
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLFloat,
    GraphQLList,
    GraphQLID,
} from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { SchemaStructure } from '../getStructures';
import { getFields, getFilterFields } from './getFields';

/**
 * Get range filter fields from list of fields.
 * @param fields definition of fields.
 * @returns definition of range filter fields.
 */
const getRangeFilterFields = (fields: any) => {
    const rangeFields = {};
    Object.keys(fields).forEach((fieldName) => {
        const fieldType = fields[fieldName].type;
        if (
            fieldType === GraphQLInt ||
            fieldType === GraphQLFloat ||
            fieldType === GraphQLDate ||
            fieldType === GraphQLDateTime ||
            fieldType === GraphQLTime
        ) {
            rangeFields[`${fieldName}_lt`] = { type: fieldType };
            rangeFields[`${fieldName}_lte`] = { type: fieldType };
            rangeFields[`${fieldName}_gt`] = { type: fieldType };
            rangeFields[`${fieldName}_gte`] = { type: fieldType };
        }
    });
    return rangeFields;
};

/**
 * Transform a string into a GraphQL filter input type name
 * @param name GraphQL name of form / resource
 * @returns name of new GraphQL filter input type
 */
const getGraphQLFilterTypeName = (name: string) => {
    return name + 'Filter';
}

/**
 * Get GraphQL filter types from the structures.
 * @param structures definition of forms / resources structures.
 * @returns array of GraphQL types of the structures.
 */
const getFilterTypes = (structures: SchemaStructure[]) => {
    return structures.map(x => {
        const fields = getFields(x.fields);
        const filterFields = getFilterFields(x.fields);
        return new GraphQLInputObjectType({
            name: getGraphQLFilterTypeName(x.name),
            fields: Object.assign(
                {
                    q: { type: GraphQLString },
                },
                {
                    ids: { type: new GraphQLList(GraphQLID) },
                },
                filterFields,
                getRangeFilterFields(fields)
            )
        });
    });
};

export default getFilterTypes;
