import GraphQLJSON from 'graphql-type-json';
import { defaultMetaFields, defaultRecordFields } from '../../../const/defaultRecordFields';
import getFieldName from './getFieldName';
import getTypeFromField from './getFieldType';

export const getMetaFields = (fields) => {
    fields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: GraphQLJSON
        }])
    );
    for (const element of defaultMetaFields) {
        fields[element.field] = { type: element.type };
    }
    return fields;
}

export const getManyToOneMetaFields = (fields) => {
    const manyToOneFields = {};
    for (const field of fields.filter(x => x.resource)) {
        manyToOneFields[getFieldName(field)] = field.resource;
    }
    return manyToOneFields;
}

export default (fields, filter = false) => {
    fields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: getTypeFromField(x, true)
        }])
    );
    for (const element of defaultRecordFields) {
        fields[element.field] = { type: element.type(filter) };
    }
    return fields;
}
