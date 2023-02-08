import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { NotificationType } from '../types';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Find notification from its id and update it.
 * Throw an error if arguments are invalid.
 */
export default {
  type: NotificationType,
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
    const filters = Notification.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    return Notification.findOneAndUpdate(filters, {
      $push: { seenBy: user._id },
    });
  },
};
