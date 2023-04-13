import { GraphQLObjectType, GraphQLString, GraphQLError } from 'graphql';
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
        const form = Form.findById(parent.convertTo).accessibleBy(ability, 'read');
        if (!form){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return form;
      },
    },
    channel: {
      type: ChannelType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const channel = Channel.findById(parent.channel).accessibleBy(ability, 'read');
        if (!channel){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return channel;
      },
    },
  }),
});
