import {
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import mongoose from 'mongoose';
import { Application, Channel, Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { createAndConsumeQueue } from '../../server/subscriberSafe';
import { SubscriptionType } from '../types/subscription.type';

/**
 * Creates a new subscription
 * Throw an error if the user is not logged or if the application, form or channel aren't found.
 */
export default {
  type: SubscriptionType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    routingKey: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    convertTo: { type: GraphQLID },
    channel: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const application = await Application.findById(args.application);
    if (!application)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));

    if (args.convertTo) {
      const form = await Form.findById(args.convertTo);
      if (!form)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }

    if (args.channel) {
      const filters = {
        application: mongoose.Types.ObjectId(args.application),
        _id: args.channel,
      };
      const channel = await Channel.findOne(filters);
      if (!channel)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
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

    const update = {
      //modifiedAt: new Date(),
      $push: { subscriptions: subscription },
    };

    const filters = Application.accessibleBy(ability, 'update')
      .where({ _id: args.application })
      .getFilter();
    await Application.findOneAndUpdate(filters, update);
    createAndConsumeQueue(args.routingKey);
    return subscription;
  },
};
