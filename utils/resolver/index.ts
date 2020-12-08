import { camelize, pluralize } from "inflection";
import { getTypeFromKey } from "../introspection/getTypeFromKey";
import Entity from "./Entity";
import all from "./Query/all";
import meta from "./Query/meta";
import single from "./Query/single";

const getQueryResolvers = (entityName, data) => ({
    [`all${camelize(pluralize(entityName))}`]: all(data),
    [`_all${camelize(pluralize(entityName))}Meta`]: meta(data),
    [entityName]: single(),
});

// const getMutationResolvers = (entityName, data) => ({
//     [`create${entityName}`]: create(data),
//     [`update${entityName}`]: update(data),
//     [`remove${entityName}`]: remove(data),
// });

export default (data) => {
    return Object.assign(
        {},
        {
            Query: Object.keys(data).reduce(
                (resolvers, key) =>
                    Object.assign(
                        {},
                        resolvers,
                        getQueryResolvers(getTypeFromKey(key), data[key])
                    ),
                {}
            ),
            Mutation: {}
            // Object.keys(data).reduce(
            //     (resolvers, key) =>
            //         Object.assign(
            //             {},
            //             resolvers,
            //             getMutationResolvers(getTypeFromKey(key), data[key])
            //         ),
            //     {}
            // ),
        },
        Object.keys(data).reduce(
            (resolvers, key) => {
                return Object.assign({}, resolvers, {
                    [getTypeFromKey(key)]: Entity(key, data),
                });
            },
            {}
        ),
        // TODO: check
        // hasType('Date', data) ? { Date: DateType } : {}, // required because makeExecutableSchema strips resolvers from typeDefs
        // TODO: check
        // hasType('JSON', data) ? { JSON: GraphQLJSON } : {} // required because makeExecutableSchema strips resolvers from typeDefs
    );
};