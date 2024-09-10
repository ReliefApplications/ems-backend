import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the seeNotifications mutation */
type SeeNotificationsArgs = {
  ids: string[] | Types.ObjectId[];
};

/**
 * Find multiple notifications and mark them as read.
 * Throw an error if arguments are invalid.
 */
export default {
  type: GraphQLBoolean,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args: SeeNotificationsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      const ability: AppAbility = context.user.ability;
      if (!args) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.notification.see.errors.invalidArguments'
          )
        );
      }
      const filters = Notification.find(
        accessibleBy(ability, 'update').Notification
      )
        .where({ _id: { $in: args.ids } })
        .getFilter();
      const result = await Notification.updateMany(filters, {
        $push: { seenBy: user._id },
      });
      return result.acknowledged;
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
