import { GraphQLID } from "graphql";
import getTypeFromField from "./getTypeFromField";

const getFieldName = (field) => {
    const name = field.name.split('-').join('_');
    return field.resource ? `${name}_id` : name;
}

export default (fields) => {
    fields = Object.fromEntries(
        fields.filter(x => x.name).map(x => [getFieldName(x), {
            type: getTypeFromField(x)
        }])
    );
    fields.id = { type: GraphQLID };
    return fields;
}