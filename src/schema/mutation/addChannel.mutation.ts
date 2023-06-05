import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { Application, Channel } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ChannelType } from '../types';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Create a new channel.
 * TODO: check rights
 */
export default {
  type: ChannelType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;
      const application = await Application.findById(args.application);
      if (!application)
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.dataNotFound')
        );
      if (ability.can('update', application)) {
        const channel = new Channel({
          title: args.title,
          application: args.application,
        });
        return await channel.save();
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
