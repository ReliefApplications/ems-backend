import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import { Permission } from '@models';
import { PermissionType } from '../types';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * List permissions.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PermissionType),
  args: {
    application: { type: GraphQLBoolean },
  },
  resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      if (user) {
        if (args.application) {
          return Permission.find({ global: false });
        }
        return Permission.find({ global: true });
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
