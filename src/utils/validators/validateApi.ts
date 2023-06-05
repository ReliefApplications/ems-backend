import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';
import i18next from 'i18next';

/**
 * Checks that API name is valid.
 *
 * @param name value to test
 */
export const validateApi = (name: string): void => {
  if (!/^[A-Za-z-_]+$/i.test(name)) {
    throw new GraphQLHandlingError(
      i18next.t('common.errors.invalidGraphQLName')
    );
  }
};
