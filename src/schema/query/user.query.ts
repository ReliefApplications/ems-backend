import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { User } from '@models';
import { UserType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Get User by ID.
 * Throw an error if logged user does not have permissions to see user, there is no logged user, or ID is invalid.
 */
export default {
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;

      if (ability.can('read', 'User')) {
        try {
          const userData = User.findById(args.id)
            .populate('roles')
            .populate('groups');
          if (!userData) {
            throw new GraphQLHandlingError(
              context.i18next.t('common.errors.dataNotFound')
            );
          }
          return userData;
        } catch (err) {
          throw new GraphQLHandlingError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }
      } else {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
