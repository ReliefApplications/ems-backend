import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { Channel, Record } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import pubsubSafe from '../../server/pubsubSafe';
import config from 'config';

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
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const channel = await Channel.findById(args.channel).populate(
      'application'
    );
    if (!channel || !channel.application) {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }
    if (ability.cannot('read', channel.application)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    const records = await Record.find({})
      .where('_id')
      .in(args.ids)
      .select('data');

    const publisher = await pubsubSafe();
    publisher.publish(
      `${config.get('rabbitMQ.application')}.${channel.application._id}.${
        args.channel
      }`,
      records
    );
    return true;
  },
};
