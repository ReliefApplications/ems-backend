import GraphQLJSON from 'graphql-type-json';
import { defaultMetaFields, defaultRecordFields } from '../../const/defaultRecordFields';
import getTypeFromField from './getTypeFromField';

const getFieldName = (field) => {
    const name = field.name.split('-').join('_');
    if (field.resource) {
        return field.type === 'resources' ? `${name}_ids` : `${name}_id`;
    }
    return name;
}

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