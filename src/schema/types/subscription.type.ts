import { GraphQLObjectType, GraphQLString } from 'graphql';
import { Channel, Form } from '@models';
import { ChannelType } from './channel.type';
import { FormType } from './form.type';
import { AppAbility } from '@security/defineUserAbility';

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
        return Form.findById(parent.convertTo).accessibleBy(ability, 'read');
      },
    },
    channel: {
      type: ChannelType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Channel.findById(parent.channel).accessibleBy(ability, 'read');
      },
    },
  }),
});
