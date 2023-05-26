import { GraphQLError } from 'graphql';
import { UserType } from '../types';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    const user = context.user;
    userNotLogged(user);
    try {
      if (user) {
        return user;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
