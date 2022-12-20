import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Channel } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ChannelType } from '../types';

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
      return Channel.findByIdAndUpdate(
        args.id,
        {
          title: args.title,
        },
        { new: true }
      );
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
