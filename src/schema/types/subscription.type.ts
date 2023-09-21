import { GraphQLObjectType, GraphQLString } from 'graphql';
import { Channel, Form } from '@models';
import { ChannelType } from './channel.type';
import { FormType } from './form.type';
import { AppAbility } from '@security/defineUserAbility';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL SubscriptionT type definition */
export const SubscriptionType = new GraphQLObjectType({
  name: 'ApplicationSubscription',
  fields: () => ({
    routingKey: { type: GraphQLString },
    title: { type: GraphQLString },
    convertTo: {
      type: FormType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.findOne({
          _id: parent.convertTo,
          ...accessibleBy(ability, 'read').Form,
        });
      },
    },
    channel: {
      type: ChannelType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Channel.findOne({
          _id: parent.channel,
          ...accessibleBy(ability, 'read').Channel,
        });
      },
    },
  }),
});
