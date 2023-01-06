import { GraphQLError } from 'graphql';
import { UserType } from '../types';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    const user = context.user;
    if (user) {
      return user;
    } else {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
  },
};
