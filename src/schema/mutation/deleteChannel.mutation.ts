import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Channel, Role } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ChannelType } from '../types';
import { logger } from '@services/logger.service';

/**
 * Delete a channel from its id and all linked notifications.
 * Throw GraphQL error if permission not granted.
 */
export default {
  type: ChannelType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try{
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
      }

      const ability: AppAbility = context.user.ability;

      if (ability.can('delete', 'Channel')) {
        const roles = await Role.find({ channels: args.id });
        for (const role of roles) {
          await Role.findByIdAndUpdate(
            role.id,
            { $pull: { channels: args.id } },
            { new: true }
          );
        }
        const channel = Channel.findByIdAndDelete(args.id);
        if (!channel){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return channel;
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    }catch (err){
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
