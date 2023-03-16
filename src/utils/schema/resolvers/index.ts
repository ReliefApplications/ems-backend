import { GraphQLError } from 'graphql';
import { pluralize } from 'inflection';
import { ApiConfiguration, ReferenceData } from '@models';
import { CustomAPI } from '../../../server/apollo/dataSources';
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
 * @param entityName Structure name
 * @param fieldsByName structure name / fields as key, value
 * @param idsByName structure name / id as key, value
 * @returns The query resolver
 */
const getQueryResolvers = (
  entityName: string,
  fieldsByName: any,
  idsByName: any
) => ({
  [`all${pluralize(entityName)}`]: all(entityName, fieldsByName, idsByName),
  [entityName]: single(),
  [`_${entityName}Meta`]: meta(idsByName[entityName]),
  [`_all${pluralize(entityName)}Meta`]: meta(idsByName[entityName]),
});

/**
 * Build the resolvers from the active forms / resources.
 *
 * @param structures definition of forms / resources.
 * @param forms list of all forms ids, names and their resources.
 * @param referenceDatas list of referenceDatas.
 * @returns GraphQL resolvers from active forms / resources.
 */
export const getResolvers = (
  structures: SchemaStructure[],
  forms: { name: string; resource?: string }[],
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
              getQueryResolvers(key, fieldsByName, idsByName)
            ),
          {}
        ),
        ...referenceDatas.reduce(
          (resolvers, referenceData) =>
            Object.assign(resolvers, {
              [referenceData.name]: async (parent, args, context) => {
                const user = context.user;
                if (!user) {
                  throw new GraphQLError(
                    context.i18next.t('common.errors.userNotLogged')
                  );
                }
                const apiConfiguration = await ApiConfiguration.findOne(
                  {
                    _id: referenceData.apiConfiguration,
                  },
                  'name endpoint graphQLEndpoint'
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
        [key]: getEntityResolver(
          key,
          fieldsByName,
          idsByName[key],
          idsByName,
          referenceDatas
        ),
        [getMetaTypeFromKey(key)]: Meta(
          key,
          fieldsByName,
          idsByName[key],
          idsByName,
          forms,
          referenceDatas
        ),
      });
    }, {})
  );
};
