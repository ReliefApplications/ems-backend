import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { NotificationType } from '../types';
import { Notification } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /*  Finds notification from its id and update it.
        Throws an error if arguments are invalid.
    */
  type: NotificationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability: AppAbility = context.user.ability;
    const filters = Notification.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    return Notification.findOneAndUpdate(filters, {
      $push: { seenBy: user.id },
    });
  },
};
