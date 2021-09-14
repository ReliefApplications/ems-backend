import GraphQLJSON from 'graphql-type-json';
import { defaultMetaFields, defaultRecordFields } from '../../../const/defaultRecordFields';
import getFieldName from './getFieldName';
import getTypeFromField from './getFieldType';

/**
 * Get meta types of list of fields.
 * @param fields list of structure fields.
 * @returns list of GraphQL meta types of the fields.
 */
export const getMetaFields = (fields: any[]) => {
    const glFields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: GraphQLJSON
        }])
    );
    for (const element of defaultMetaFields) {
        Object.assign(glFields[element.field], { type: element.type });
    }
    return glFields;
}

export const getManyToOneMetaFields = (fields) => {
    const manyToOneFields = {};
    for (const field of fields.filter(x => x.resource)) {
        manyToOneFields[getFieldName(field)] = field.resource;
    }
    return manyToOneFields;
}

export const getFields = (fields: any) => {
    const glFields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: getTypeFromField(x, true)
        }])
    );
    for (const element of defaultRecordFields) {
        Object.assign(glFields[element.field], { type: element.type });
    }
    return glFields;
}

export const getFilterFields = (fields: any) => {
    const glFields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: getTypeFromField(x, true)
        }])
    );
    for (const element of defaultRecordFields) {
        Object.assign(glFields[element.field], { type: element.filterType });
    }
    return glFields;
}
