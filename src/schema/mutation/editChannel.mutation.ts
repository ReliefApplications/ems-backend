import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Channel } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ChannelType } from '../types';
import { logger } from '@services/logger.service';

/**
 * Edit a channel.
 * Throw GraphQL error if permission not granted.
 */
export default {
  type: ChannelType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    const channel = await Channel.findById(args.id);
    if (!channel)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    if (ability.can('update', channel)) {
      try {
        return await Channel.findByIdAndUpdate(
          args.id,
          {
            title: args.title,
          },
          { new: true }
        );
      } catch (err) {
        logger.error(err.message, { stack: err.stack });
        throw new GraphQLError(
          context.i18next.t('common.errors.internalServerError')
        );
      }
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
