import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLError
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ApiConfiguration, Form, Channel } from '@models';
import { StatusEnumType } from '@const/enumTypes';
import { AppAbility } from '@security/defineUserAbility';
import { ApiConfigurationType } from './apiConfiguration.type';
import { ChannelType } from './channel.type';
import { FormType } from './form.type';
import { Connection } from './pagination.type';

/** GraphQL pull job type definition */
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
        const apiConfiguration = ApiConfiguration.findById(parent.apiConfiguration).accessibleBy(
          ability,
          'read'
        );
        if (!apiConfiguration){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return apiConfiguration;
      },
    },
    url: { type: GraphQLString },
    path: { type: GraphQLString },
    schedule: { type: GraphQLString },
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
    mapping: { type: GraphQLJSON },
    uniqueIdentifiers: { type: new GraphQLList(GraphQLString) },
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

/** GraphQL pull job connection type defiinition */
export const PullJobConnectionType = Connection(PullJobType);
