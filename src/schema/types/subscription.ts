import { GraphQLObjectType, GraphQLString } from 'graphql';
import { Channel, Form } from '../../models';
import { ChannelType } from './channel';
import { FormType } from './form';

export const SubscriptionType = new GraphQLObjectType({
    name: 'ApplicationSubscription',
    fields: () => ({
        routingKey: { type: GraphQLString },
        title: { type: GraphQLString },
        convertTo: {
            type: FormType,
            resolve(parent) {
                return Form.findById(parent.convertTo);
            }
        },
        channel: {
            type: ChannelType,
            resolve(parent) {
                return Channel.findById(parent.channel);
            }
        }
    })
});
