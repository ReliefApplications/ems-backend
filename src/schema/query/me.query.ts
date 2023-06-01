import { GraphQLError } from 'graphql';
import { UserType } from '../types';
import { logger } from '@services/logger.service';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    let user;
    try {
      user = context.user;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
    if (user) {
      return user;
    } else {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
  },
};
