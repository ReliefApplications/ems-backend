import { GraphQLObjectType } from "graphql";
import { camelize, singularize } from "inflection";
import { getMetaFields } from "./getFields";

export default (data) => {
    return Object.keys(data)
    .map((typeName) => ({
        name: `_${camelize(singularize(typeName))}Meta`,
        fields: getMetaFields(data[typeName]),
    }))
    .map((typeObject: any) => new GraphQLObjectType(typeObject));
}