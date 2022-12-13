import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Role } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';

/**
 * Deletes a role.
 * Throws an error if not logged or authorized.
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
    const filters = Role.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const role = await Role.findOneAndDelete(filters);
    if (role) {
      return role;
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
