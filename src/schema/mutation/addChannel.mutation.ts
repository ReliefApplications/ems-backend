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
import { graphQLAuthCheck } from '@schema/shared';

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
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      const application = await Application.findById(args.application);
      if (!application)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      if (ability.can('update', application)) {
        const channel = new Channel({
          title: args.title,
          application: args.application,
        });
        return await channel.save();
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
