import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ApiConfiguration, Form, Channel } from '@models';
import { StatusEnumType } from '@const/enumTypes';
import { AppAbility } from '@security/defineUserAbility';
import { ApiConfigurationType } from './apiConfiguration.type';
import { ChannelType } from './channel.type';
import { FormType } from './form.type';
import { Connection } from './pagination.type';
import { accessibleBy } from '@casl/mongoose';

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
        return ApiConfiguration.findOne({
          _id: parent.apiConfiguration,
          ...accessibleBy(ability, 'read').ApiConfiguration,
        });
      },
    },
    url: { type: GraphQLString },
    path: { type: GraphQLString },
    schedule: { type: GraphQLString },
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
    mapping: { type: GraphQLJSON },
    uniqueIdentifiers: { type: new GraphQLList(GraphQLString) },
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

/** GraphQL pull job connection type definition */
export const PullJobConnectionType = Connection(PullJobType);
