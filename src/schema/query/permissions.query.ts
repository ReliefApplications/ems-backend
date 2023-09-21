import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import { Permission } from '@models';
import { PermissionType } from '../types';
import { logger } from '@services/logger.service';

/**
 * List permissions.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PermissionType),
  args: {
    application: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (user) {
        if (args.application) {
          const permissions = await Permission.find({ global: false });
          return permissions;
        }
        const permissions = await Permission.find({ global: false });
        return permissions;
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
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
