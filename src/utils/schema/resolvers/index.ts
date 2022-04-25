import errors from '../../../const/errors';
import { GraphQLError } from 'graphql';
import { pluralize } from 'inflection';
import { ApiConfiguration, ReferenceData } from '../../../models';
import { CustomAPI } from '../../../server/apollo/dataSources';
import { SchemaStructure } from '../getStructures';
import { getMetaTypeFromKey } from '../introspection/getTypeFromKey';
import { getEntityResolver } from './Entity';
import Meta from './Meta';
import all from './Query/all';
import meta from './Query/meta';
import single from './Query/single';

const getQueryResolvers = (entityName, data, id) => ({
  [`all${pluralize(entityName)}`]: all(id, data),
  [entityName]: single(),
  [`_${entityName}Meta`]: meta(id),
  [`_all${pluralize(entityName)}Meta`]: meta(id),
});

/**
 * Build the resolvers from the active forms / resources.
 *
 * @param structures definition of forms / resources.
 * @param referenceDatas list of referenceDatas.
 * @returns GraphQL resolvers from active forms / resources.
 */
export const getResolvers = (
  structures: SchemaStructure[],
  referenceDatas: ReferenceData[]
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
      Query: {
        ...Object.keys(fieldsByName).reduce(
          (resolvers, key) =>
            Object.assign(
              {},
              resolvers,
              getQueryResolvers(key, fieldsByName[key], idsByName[key])
            ),
          {}
        ),
        ...referenceDatas.reduce(
          (resolvers, referenceData) =>
            Object.assign(resolvers, {
              [referenceData.name]: async (parent, args, context) => {
                const user = context.user;
                if (!user) {
                  throw new GraphQLError(errors.userNotLogged);
                }
                const apiConfiguration = await ApiConfiguration.findOne(
                  {
                    _id: referenceData.apiConfiguration,
                  },
                  'name endpoint'
                );
                if (apiConfiguration) {
                  const dataSource: CustomAPI =
                    context.dataSources[apiConfiguration.name];
                  return dataSource.getReferenceDataItems(
                    referenceData,
                    apiConfiguration
                  );
                }
                return null;
              },
            }),
          {}
        ),
      },
    },
    Object.keys(fieldsByName).reduce((resolvers, key) => {
      return Object.assign({}, resolvers, {
        [key]: getEntityResolver(key, fieldsByName, idsByName[key], idsByName),
        [getMetaTypeFromKey(key)]: Meta(
          key,
          fieldsByName,
          idsByName[key],
          idsByName
        ),
      });
    }, {})
  );
};
