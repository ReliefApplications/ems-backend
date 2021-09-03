import { camelize, pluralize } from 'inflection';
import { getMetaTypeFromKey, getTypeFromKey } from '../introspection/getTypeFromKey';
import { getEntityResolver } from './Entity';
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

/**
 * Returns Queries resolvers from the structures.
 * @param fieldsByName fields of structures with name as key.
 * @param idsByName ids of structures with name as key.
 * @returns resolvers for entities / meta / list queries.
 */
export const getResolvers = (fieldsByName: any, idsByName: any): any => {
    return Object.assign(
        {},
        {
            Query: Object.keys(fieldsByName).reduce(
                (resolvers, key) =>
                    Object.assign(
                        {},
                        resolvers,
                        getQueryResolvers(getTypeFromKey(key), fieldsByName[key], idsByName[key])
                    ),
                {}
            )
        },
        Object.keys(fieldsByName).reduce(
            (resolvers, key) => {
                return Object.assign({}, resolvers, {
                    [getTypeFromKey(key)]: getEntityResolver(key, fieldsByName, idsByName[key], idsByName),
                    [getMetaTypeFromKey(key)]: Meta(key, fieldsByName, idsByName[key], idsByName)
                });
            },
            {}
        )
    );
};

// TODO: check
// hasType('Date', data) ? { Date: DateType } : {}, // required because makeExecutableSchema strips resolvers from typeDefs
// TODO: check
// hasType('JSON', data) ? { JSON: GraphQLJSON } : {} // required because makeExecutableSchema strips resolvers from typeDefs
