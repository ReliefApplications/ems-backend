import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
} from 'graphql';
import { User } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Delete a user.
 * Throw an error if not logged or authorized.
 */
export default {
  type: GraphQLInt,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    if (ability.can('delete', 'User')) {
      const result = await User.deleteMany({ _id: { $in: args.ids } });
      return result.deletedCount;
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
