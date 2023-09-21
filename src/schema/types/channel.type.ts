import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import { Application, Role, Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ApplicationType } from './application.type';
import { RoleType } from './role.type';
import { FormType } from './form.type';
import config from 'config';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL channel type definition */
export const ChannelType = new GraphQLObjectType({
  name: 'Channel',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findOne({
          _id: parent.application,
          ...accessibleBy(ability, 'read').Application,
        });
      },
    },
    subscribedRoles: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.find({
          channels: parent._id,
          ...accessibleBy(ability, 'read').Role,
        });
      },
    },
    form: {
      type: FormType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.findOne({
          _id: parent._id,
          ...accessibleBy(ability, 'read').Form,
        });
      },
    },
    routingKey: {
      type: GraphQLString,
      resolve(parent) {
        if (parent.application) {
          return `${config.get('rabbitMQ.application')}.${parent.application}.${
            parent.id
          }`;
        } else {
          return `${config.get('rabbitMQ.application')}.${parent.id}`;
        }
      },
    },
  }),
});
