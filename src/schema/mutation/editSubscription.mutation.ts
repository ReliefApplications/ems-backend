import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Application } from '@models';
import { SubscriptionType } from '../types/subscription.type';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editSubscription mutation */
type EditSubscriptionArgs = {
  applicationId: string | Types.ObjectId;
  routingKey: string;
  title: string;
  convertTo: string;
  channel: string;
  previousSubscription: string;
};

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
  async resolve(parent, args: EditSubscriptionArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const filters = Application.find(
        accessibleBy(ability, 'update').Application
      )
        .where({ _id: args.applicationId })
        .getFilter();
      const application = await Application.findOne(filters);
      if (!application) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const subscription = {
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
      if (args.routingKey !== args.previousSubscription) {
        // createAndConsumeQueue(args.routingKey);
        // deleteQueue(args.previousSubscription);
      }
      return subscription;
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
