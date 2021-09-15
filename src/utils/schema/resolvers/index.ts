import { camelize, pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
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
 * Build the resolvers from the active forms / resources.
 * @param structures definition of forms / resources.
 * @returns GraphQL resolvers from active forms / resources.
 */
export const getResolvers = (structures: SchemaStructure[]): any => {

    const fieldsByName: any = structures.reduce((obj, x) => {
        obj[x.name] = x.fields;
        return obj;
    }, {});

    const idsByName: any = structures.reduce((obj, x) => {
        obj[x.name] = x._id;
        return obj;
    }, {});

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
