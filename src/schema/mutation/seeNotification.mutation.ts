import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { NotificationType } from '../types';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

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
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      const ability: AppAbility = context.user.ability;
      const filters = Notification.find(
        accessibleBy(ability, 'update').Notification
      )
        .where({ _id: args.id })
        .getFilter();
      return await Notification.findOneAndUpdate(filters, {
        $push: { seenBy: user._id },
      });
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
