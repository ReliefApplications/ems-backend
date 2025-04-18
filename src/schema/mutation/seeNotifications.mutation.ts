import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList } from 'graphql';
import { Notification } from '@models';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { NotificationType } from '@schema/types';

/** Arguments for the seeNotifications mutation */
type SeeNotificationsArgs = {
  ids: string[] | Types.ObjectId[];
};

/**
 * Find multiple notifications and mark them as read.
 * Throw an error if arguments are invalid.
 */
export default {
  type: new GraphQLList(NotificationType),
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args: SeeNotificationsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      if (!args) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.notification.see.errors.invalidArguments'
          )
        );
      }
      await Notification.updateMany(
        { _id: { $in: args.ids } },
        {
          $addToSet: { seenBy: user._id },
        }
      );
      return await Notification.find({ _id: { $in: args.ids } });
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
