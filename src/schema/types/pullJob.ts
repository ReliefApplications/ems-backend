import { GraphQLObjectType, GraphQLID, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ApiConfiguration, Form, Channel} from '../../models';
import { StatusEnumType } from '../../const/enumTypes';
import { AppAbility } from '../../security/defineAbilityFor';
import { ApiConfigurationType } from './apiConfiguration';
import { ChannelType } from './channel';
import { FormType } from './form';

export const PullJobType = new GraphQLObjectType({
    name: 'PullJob',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        status: { type: StatusEnumType },
        apiConfiguration: {
            type: ApiConfigurationType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ApiConfiguration.findById(parent.apiConfiguration).accessibleBy(ability, 'read');
            }
        },
        schedule : { type: GraphQLString },
        convertTo: {
            type: FormType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Form.findById(parent.convertTo).accessibleBy(ability, 'read');
            }
        },
        mapping: { type: GraphQLJSON },
        channel: {
            type: ChannelType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Channel.findById(parent.channel).accessibleBy(ability, 'read');
            }
        }
    })
});
