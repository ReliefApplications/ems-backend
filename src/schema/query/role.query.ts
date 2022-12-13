import { GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { AppAbility } from '@security/defineUserAbility';

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
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (ability.can('read', 'Role')) {
      try {
        const role = await Role.accessibleBy(ability, 'read').findOne({
          _id: args.id,
        });
        if (!role) {
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }
        return role;
      } catch {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
