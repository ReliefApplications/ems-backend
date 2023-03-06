import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GroupType } from '../types';

/**
 * Deletes a group.
 * Throws an error if not logged or authorized.
 */
export default {
  type: GroupType,
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
    const filters = Group.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const group = await Group.findOneAndDelete(filters);
    if (group) {
      return group;
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
