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
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

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
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = context.user.ability;
      const channel = await Channel.findById(args.id);
      if (!channel)
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.dataNotFound')
        );
      if (ability.can('update', channel)) {
        return await Channel.findByIdAndUpdate(
          args.id,
          {
            title: args.title,
          },
          { new: true }
        );
      } else {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
