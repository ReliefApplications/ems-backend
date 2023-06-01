import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Application } from '@models';
import { SubscriptionType } from '../types/subscription.type';
import { AppAbility } from '@security/defineUserAbility';
import {
  createAndConsumeQueue,
  deleteQueue,
} from '../../server/subscriberSafe';
import { logger } from '@services/logger.service';

/**
 * Edit a subscription.
 * Throw an error if not logged or authorized.
 */
export default {
  type: SubscriptionType,
  args: {
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
    routingKey: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    convertTo: { type: new GraphQLNonNull(GraphQLString) },
    channel: { type: new GraphQLNonNull(GraphQLString) },
    previousSubscription: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const filters = Application.accessibleBy(ability, 'update')
      .where({ _id: args.applicationId })
      .getFilter();
    const application = await Application.findOne(filters);
    if (!application) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    let subscription;
    try {
      subscription = {
        routingKey: args.routingKey,
        title: args.title,
      };
      Object.assign(
        subscription,
        args.convertTo && { convertTo: args.convertTo },
        args.channel && { channel: args.channel }
      );

      application.subscriptions = application.subscriptions.map((sub) => {
        if (sub.routingKey === args.previousSubscription) {
          sub = subscription;
        }
        return sub;
      });

      await Application.findByIdAndUpdate(args.applicationId, application, {
        new: true,
      });
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
    if (args.routingKey !== args.previousSubscription) {
      createAndConsumeQueue(args.routingKey);
      deleteQueue(args.previousSubscription);
    }
    return subscription;
  },
};
