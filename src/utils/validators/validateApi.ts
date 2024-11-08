import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Checks that API name is valid.
 * API name should only consist of alphanumeric characters.
 *
 * @param name value to test
 */
export const validateApi = (name: string): void => {
  if (!/^[A-Za-z-_]+$/i.test(name)) {
    throw new GraphQLError(i18next.t('common.errors.invalidGraphQLName'));
  }
};
