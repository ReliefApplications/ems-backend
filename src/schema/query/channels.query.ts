import { GraphQLError, GraphQLID, GraphQLList } from 'graphql';
import { Channel } from '@models';
import { ChannelType } from '../types';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * List all channels available.
 * TODO : not working
 */
export default {
  type: new GraphQLList(ChannelType),
  args: {
    application: { type: GraphQLID },
  },
  resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      const ability = context.user.ability;
      return args.application
        ? Channel.accessibleBy(ability, 'read').where({
            application: args.application,
          })
        : Channel.accessibleBy(ability, 'read');
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
