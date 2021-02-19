import { GraphQLID } from "graphql";
import { GraphQLDateTime } from "graphql-iso-date";
import GraphQLJSON from "graphql-type-json";
import getTypeFromField from "./getTypeFromField";

const getFieldName = (field) => {
    const name = field.name.split('-').join('_');
    return field.resource ? `${name}_id` : name;
}

export const getMetaFields = (fields) => {
    fields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: GraphQLJSON
        }])
    );
    fields.id = { type: GraphQLJSON };
    fields.createdAt = { type: GraphQLJSON };
    return fields;
}

export default (fields) => {
    fields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: getTypeFromField(x)
        }])
    );
    fields.id = { type: GraphQLID };
    fields.createdAt = { type: GraphQLDateTime }
    return fields;
}