import { pluralize } from 'inflection';
import { SchemaStructure } from '../getStructures';
import { getMetaTypeFromKey } from '../introspection/getTypeFromKey';
import { getEntityResolver } from './Entity';
import Meta from './Meta';
import all from './Query/all';
import meta from './Query/meta';
import single from './Query/single';

/**
 * Gets the query resolver
 *
 * @param entityName Field name
 * @param data Structures fields
 * @param ids Structures ids
 * @returns The query resolver
 */
const getQueryResolvers = (entityName, data, ids) => ({
  [`all${pluralize(entityName)}`]: all(entityName, ids, data),
  [entityName]: single(),
  [`_${entityName}Meta`]: meta(ids[entityName]),
  [`_all${pluralize(entityName)}Meta`]: meta(ids[entityName]),
});

/**
 * Build the resolvers from the active forms / resources.
 *
 * @param structures definition of forms / resources.
 * @param forms list of all forms ids, names and their resources.
 * @returns GraphQL resolvers from active forms / resources.
 */
export const getResolvers = (
  structures: SchemaStructure[],
  forms: { name: string; resource?: string }[]
): any => {
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
            getQueryResolvers(key, fieldsByName, idsByName)
          ),
        {}
      ),
    },
    Object.keys(fieldsByName).reduce((resolvers, key) => {
      return Object.assign({}, resolvers, {
        [key]: getEntityResolver(key, fieldsByName, idsByName[key], idsByName),
        [getMetaTypeFromKey(key)]: Meta(
          key,
          fieldsByName,
          idsByName[key],
          idsByName,
          forms
        ),
      });
    }, {})
  );
};
