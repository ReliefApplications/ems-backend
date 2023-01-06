import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Find multiple notifications and mark them as read.
 * Throw an error if arguments are invalid.
 */
export default {
  type: GraphQLBoolean,
  args: {
    ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (!args) {
      throw new GraphQLError(
        context.i18next.t('mutations.notification.see.errors.invalidArguments')
      );
    }
    const filters = Notification.accessibleBy(ability, 'update')
      .where({ _id: { $in: args.ids } })
      .getFilter();
    const result = await Notification.updateMany(filters, {
      $push: { seenBy: user._id },
    });
    return result.ok === 1;
  },
};
