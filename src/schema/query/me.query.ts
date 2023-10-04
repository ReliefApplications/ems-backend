import { GraphQLError } from 'graphql';
import { UserType } from '../types';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    graphQLAuthCheck(context);
    try {
      return context.user;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
