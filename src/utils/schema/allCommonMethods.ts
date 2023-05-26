import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Check user login or not.
 * Throw error for user not logged.
 */
export const userNotLogged = (user: any): void => {
  if (!user) {
    throw new GraphQLError(i18next.t('common.errors.userNotLogged'));
  }
};
