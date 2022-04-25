import { GraphQLError, GraphQLID, GraphQLList } from 'graphql';
import { Channel } from '../../models';
import { ChannelType } from '../types';

// TODO : not working
export default {
  /*  List all channels available.
   */
  type: new GraphQLList(ChannelType),
  args: {
    application: { type: GraphQLID },
  },
  resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability = context.user.ability;
    return args.application
      ? Channel.accessibleBy(ability, 'read').where({
          application: args.application,
        })
      : Channel.accessibleBy(ability, 'read');
  },
};
