import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from 'security/defineUserAbility';
import { Channel, User } from '../../models';
import { ChannelType } from './channel';
import { UserType } from './user';
import { Connection } from './pagination';

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
      resolve(parent) {
        return Channel.findById(parent.channel);
      },
    },
    seenBy: {
      type: new GraphQLList(UserType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return User.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.seenBy);
      },
    },
  }),
});

/** GraphQL notification connection type definition */
export const NotificationConnectionType = Connection(NotificationType);
