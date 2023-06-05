import { GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Get Query by ID.
 * Throw error if user is not logged, or does not have permission to see role, or role does not exist.
 */
export default {
  type: RoleType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'Role')) {
        try {
          const role = await Role.accessibleBy(ability, 'read').findOne({
            _id: args.id,
          });
          if (!role) {
            throw new GraphQLHandlingError(
              context.i18next.t('common.errors.dataNotFound')
            );
          }
          return role;
        } catch {
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
