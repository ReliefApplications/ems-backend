import { camelize, pluralize } from 'inflection';
import { getMetaTypeFromKey, getTypeFromKey } from '../introspection/getTypeFromKey';
import Entity from './Entity';
import Meta from './Meta';
import all from './Query/all';
import meta from './Query/meta';
import single from './Query/single';

const getQueryResolvers = (entityName, data, id) => ({
    [`all${camelize(pluralize(entityName))}`]: all(id, data),
    [entityName]: single(),
    [`_${entityName}Meta`]: meta(id),
    [`_all${camelize(pluralize(entityName))}Meta`]: meta(id)
});

// const getMutationResolvers = (entityName, data) => ({
//     [`create${entityName}`]: create(data),
//     [`update${entityName}`]: update(data),
//     [`remove${entityName}`]: remove(data),
// });

export default (data: any, ids: string[]): any => {
    return Object.assign(
        {},
        {
            Query: Object.keys(data).reduce(
                (resolvers, key) =>
                    Object.assign(
                        {},
                        resolvers,
                        getQueryResolvers(getTypeFromKey(key), data[key], ids[key])
                    ),
                {}
            ),
            // Mutation: {}
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
                    [getTypeFromKey(key)]: Entity(key, data, ids[key], ids),
                    [getMetaTypeFromKey(key)]: Meta(key, data, ids[key], ids)
                });
            },
            {}
        )
        // TODO: check
        // hasType('Date', data) ? { Date: DateType } : {}, // required because makeExecutableSchema strips resolvers from typeDefs
        // TODO: check
        // hasType('JSON', data) ? { JSON: GraphQLJSON } : {} // required because makeExecutableSchema strips resolvers from typeDefs
    );
};