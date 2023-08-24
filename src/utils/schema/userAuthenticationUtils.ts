import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Check user login or not.
 * Throw error for user not logged.
 * @param user login user data
 */
export const checkUserAuthenticated = (user: any): void => {
  if (!user) {
    throw new GraphQLError(i18next.t('common.errors.checkUserAuthenticated'));
  }
};
