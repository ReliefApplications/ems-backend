import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { NotificationType } from '../types';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

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
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      const filters = Notification.accessibleBy(ability, 'update')
        .where({ _id: args.id })
        .getFilter();
      return await Notification.findOneAndUpdate(filters, {
        $push: { seenBy: user._id },
      });
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
