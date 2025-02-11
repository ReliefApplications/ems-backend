import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from 'security/defineUserAbility';
import { Channel, User } from '@models';
import { ChannelType } from './channel.type';
import { UserType } from './user.type';
import { Connection } from './pagination.type';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL notification type definition */
export const NotificationType = new GraphQLObjectType({
  name: 'Notification',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    action: { type: GraphQLString },
    content: { type: GraphQLJSON },
    createdAt: { type: GraphQLString },
    channel: {
      type: ChannelType,
      async resolve(parent) {
        const channel = await Channel.findById(parent.channel);
        return channel;
      },
    },
    seenBy: {
      type: new GraphQLList(UserType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context?.user.ability;
        const users = await User.find(accessibleBy(ability, 'read').User)
          .where('_id')
          .in(parent.seenBy);
        return users;
      },
    },
    user: { type: UserType },
    redirect: { type: GraphQLJSON },
  }),
});

/** GraphQL notification connection type definition */
export const NotificationConnectionType = Connection(NotificationType);
