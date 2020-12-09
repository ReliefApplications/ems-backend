import {
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLFloat,
    GraphQLList,
    GraphQLID,
} from 'graphql';
import getFields from './getFields';
import { getTypeFromKey } from './getTypeFromKey';

const getRangeFilters = (entities) => {
    // const fieldValues = getValuesFromEntities(entities);
    return {};
    // return Object.keys(fieldValues).reduce((fields, fieldName) => {
    //     const fieldType = getTypeFromField(
    //         fieldName,
    //         fieldValues[fieldName],
    //         false
    //     );
    //     if (
    //         fieldType == GraphQLInt ||
    //         fieldType == GraphQLFloat ||
    //         fieldType.name == 'Date'
    //     ) {
    //         fields[`${fieldName}_lt`] = { type: fieldType };
    //         fields[`${fieldName}_lte`] = { type: fieldType };
    //         fields[`${fieldName}_gt`] = { type: fieldType };
    //         fields[`${fieldName}_gte`] = { type: fieldType };
    //     }
    //     return fields;
    // }, {});
};

export default (data) => {
    console.log(Object.keys(data));
    return Object.keys(data).reduce(
        (types, key) => {
            console.log(getFields(data[key]));
            console.log(getRangeFilters(data[key]));
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
                        getFields(data[key]),
                        getRangeFilters(data[key])
                    ),
                }),
            });
        },
        {}
    );
}