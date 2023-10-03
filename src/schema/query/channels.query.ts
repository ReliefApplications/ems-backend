import { GraphQLError, GraphQLID, GraphQLList } from 'graphql';
import { Channel } from '@models';
import { ChannelType } from '../types';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';

/** Arguments for the channels query */
type ChannelsArgs = {
  application?: string | Types.ObjectId;
};

/**
 * List all channels available.
 * TODO : not working
 */
export default {
  type: new GraphQLList(ChannelType),
  args: {
    application: { type: GraphQLID },
  },
  async resolve(parent, args: ChannelsArgs, context) {
    graphQLAuthCheck(context);
    try {
      const ability = context.user.ability;
      const channels = args.application
        ? await Channel.find({
            application: args.application,
            ...accessibleBy(ability, 'read').Channel,
          })
        : await Channel.find(accessibleBy(ability, 'read').Channel);
      return channels;
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
