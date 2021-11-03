import { GraphQLObjectType, GraphQLString } from 'graphql';
import { Channel, Form } from '../../models';
import { ChannelType } from './channel';
import { FormType } from './form';
import { AppAbility } from '../../security/defineAbilityFor';

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
