import { GraphQLNonNull, GraphQLString, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { Application, Channel } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { ChannelType } from '../types';

export default {
  /*  Creates a new channel.
        TODO: check rights
    */
  type: ChannelType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    const application = await Application.findById(args.application);
    if (!application) throw new GraphQLError(errors.dataNotFound);
    if (ability.can('update', application)) {
      const channel = new Channel({
        title: args.title,
        application: args.application,
      });
      return channel.save();
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
