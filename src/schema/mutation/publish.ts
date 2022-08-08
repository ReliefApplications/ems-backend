import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { Channel, Record } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import pubsubSafe from '../../server/pubsubSafe';

/**
 * Publish records in a notification.
 */
export default {
  type: GraphQLBoolean,
  args: {
    ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
    channel: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const channel = await Channel.findById(args.channel).populate(
      'application'
    );
    if (!channel || !channel.application) {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }
    if (ability.cannot('read', channel.application)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const records = await Record.find({})
      .where('_id')
      .in(args.ids)
      .select('data');

    const publisher = await pubsubSafe();
    publisher.publish(
      `${process.env.RABBITMQ_APPLICATION}.${channel.application._id}.${args.channel}`,
      records
    );
    return true;
  },
};
