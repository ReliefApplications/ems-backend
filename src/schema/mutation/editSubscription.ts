import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import errors from '../../const/errors';
import { Application } from '../../models';
import { SubscriptionType } from '../types/subscription';
import { AppAbility } from '../../security/defineAbilityFor';
import {
  createAndConsumeQueue,
  deleteQueue,
} from '../../server/subscriberSafe';

export default {
  /*  Edits a subscription.
        Throws an error if not logged or authorized.
    */
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
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability: AppAbility = context.user.ability;
    const filters = Application.accessibleBy(ability, 'update')
      .where({ _id: args.applicationId })
      .getFilter();
    const application = await Application.findOne(filters);
    if (!application) {
      throw new GraphQLError(errors.permissionNotGranted);
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
      createAndConsumeQueue(args.routingKey);
      deleteQueue(args.previousSubscription);
    }
    return subscription;
  },
};
