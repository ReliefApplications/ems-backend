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
import { accessibleBy } from '@casl/mongoose';

/** GraphQL channel type definition */
export const ChannelType = new GraphQLObjectType({
  name: 'Channel',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    application: {
      type: ApplicationType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const application = await Application.findOne({
          _id: parent.application,
          ...accessibleBy(ability, 'read').Application,
        });
        return application;
      },
    },
    subscribedRoles: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const roles = await Role.find({
          application: parent.id,
          ...accessibleBy(ability, 'read').Role,
        });
        return roles;
      },
    },
    form: {
      type: FormType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const form = await Form.findOne({
          _id: parent._id,
          ...accessibleBy(ability, 'read').Form,
        });
        return form;
      },
    },
    routingKey: {
      type: GraphQLString,
      resolve(parent) {
        if (parent.application) {
          return `${parent.application}.${parent.id}`;
        } else {
          return `${parent.id}`;
        }
      },
    },
  }),
});
