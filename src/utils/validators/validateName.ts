import protectedNames from '../../const/protectedNames';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import { getGraphQLTypeName } from '../../utils/schema/getStructures';
import { NameExtension } from '../../utils/schema/introspection/getFieldName';

/**
 * Names from Applications / Resources / Forms are transferred into a graphQL Type, so they should not clash with existing types.
 *
 * @param {string} name value to test
 */
export const validateName = (name: string): void => {
  if (!/^[a-z0-9\s_-]+$/i.test(name)) {
    throw new GraphQLError(i18next.t('errors.invalidAddApplicationName'));
  }
  if (
    protectedNames.indexOf(name.toLowerCase()) >= 0 ||
    getGraphQLTypeName(name).endsWith(
      getGraphQLTypeName(NameExtension.referenceData)
    )
  ) {
    throw new GraphQLError(i18next.t('errors.usageOfProtectedName'));
  }
};
