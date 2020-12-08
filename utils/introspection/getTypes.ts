import { GraphQLID, GraphQLObjectType } from "graphql";
import { camelize, singularize } from "inflection";
import getFields from "./getFields";
import { getTypeFromKey } from "./getTypeFromKey";

function getTypes(data) {

    return Object.keys(data)
    .map((typeName) => ({
        name: camelize(singularize(typeName)),
        fields: getFields(data[typeName]),
    }))
    .map((typeObject: any) => new GraphQLObjectType(typeObject));
}

export default getTypes;

export const getTypeNamesFromData = (data) =>
    Object.keys(data).map(getTypeFromKey);