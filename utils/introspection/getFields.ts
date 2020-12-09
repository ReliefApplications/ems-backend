import { GraphQLID } from "graphql";
import getTypeFromField from "./getTypeFromField";

export default (fields) => {
    fields = Object.fromEntries(
        fields.map(x => [x.name, {
            type: getTypeFromField(x)
        }])
    );
    fields.id = { type: GraphQLID };
    return fields;
}