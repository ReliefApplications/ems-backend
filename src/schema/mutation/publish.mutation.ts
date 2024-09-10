import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { Application, Channel, Record } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import pubsubSafe from '../../server/pubsubSafe';
import config from 'config';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the publish mutation */
type PublishArgs = {
  ids: string[] | Types.ObjectId[];
  channel: string | Types.ObjectId;
};

/**
 * Publish records in a notification.
 */
export default {
  type: GraphQLBoolean,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    channel: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: PublishArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const channel = await Channel.findById(args.channel).populate({
        path: 'application',
        model: 'Application',
      });
      if (!channel || !channel.application) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      if (ability.cannot('read', channel.application as Application)) {
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
