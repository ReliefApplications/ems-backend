import {
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLFloat,
    GraphQLList,
    GraphQLID,
} from 'graphql';
import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date';
import getFields from './getFields';
import { getTypeFromKey } from './getTypeFromKey';

const getRangeFilters = (fields) => {
    const rangeFields = {};
    Object.keys(fields).forEach((fieldName) => {
        const fieldType = fields[fieldName].type;
        if (
            fieldType === GraphQLInt ||
            fieldType === GraphQLFloat ||
            fieldType === GraphQLDate ||
            fieldType === GraphQLDateTime
        ) {
            rangeFields[`${fieldName}_lt`] = { type: fieldType };
            rangeFields[`${fieldName}_lte`] = { type: fieldType };
            rangeFields[`${fieldName}_gt`] = { type: fieldType };
            rangeFields[`${fieldName}_gte`] = { type: fieldType };
        }
    });
    return rangeFields;
};

export default (data) => {
    return Object.keys(data).reduce(
        (types, key) => {
            return Object.assign({}, types, {
                [getTypeFromKey(key)]: new GraphQLInputObjectType({
                    name: `${getTypeFromKey(key)}Filter`,
                    fields: Object.assign(
                        {
                            q: { type: GraphQLString },
                        },
                        {
                            ids: { type: new GraphQLList(GraphQLID) },
                        },
                        getFields(data[key], true),
                        getRangeFilters(getFields(data[key]))
                    ),
                }),
            });
        },
        {}
    );
}
