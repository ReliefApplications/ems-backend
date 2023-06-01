import { GraphQLList, GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { logger } from '@services/logger.service';

/**
 * List passed applications roles if user is logged, but only title and id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(RoleType),
  args: {
    applications: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
  },
  resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    try {
      return Role.find({ application: { $in: args.applications } }).select(
        'id title application'
      );
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
