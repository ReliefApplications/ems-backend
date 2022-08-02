import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ApiConfiguration, Form, Channel } from '../../models';
import { StatusEnumType } from '../../const/enumTypes';
import { AppAbility } from '../../security/defineUserAbilities';
import { ApiConfigurationType } from './apiConfiguration';
import { ChannelType } from './channel';
import { FormType } from './form';
import { Connection } from './pagination';

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
        return ApiConfiguration.findById(parent.apiConfiguration).accessibleBy(
          ability,
          'read'
        );
      },
    },
    url: { type: GraphQLString },
    path: { type: GraphQLString },
    schedule: { type: GraphQLString },
    convertTo: {
      type: FormType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.findById(parent.convertTo).accessibleBy(ability, 'read');
      },
    },
    mapping: { type: GraphQLJSON },
    uniqueIdentifiers: { type: new GraphQLList(GraphQLString) },
    channel: {
      type: ChannelType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Channel.findById(parent.channel).accessibleBy(ability, 'read');
      },
    },
  }),
});

/** GraphQL pull job connection type defiinition */
export const PullJobConnectionType = Connection(PullJobType);
