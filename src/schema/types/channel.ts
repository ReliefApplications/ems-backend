import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList } from 'graphql';
import { Application, Role, Form } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { ApplicationType } from './application';
import { RoleType } from './role';
import { FormType } from './form';

export const ChannelType = new GraphQLObjectType({
  name: 'Channel',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findById(parent.application).accessibleBy(ability, 'read');
      },
    },
    subscribedRoles: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read').find({ channels: parent._id });
      },
    },
    form: {
      type: FormType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.findById(parent._id).accessibleBy(ability, 'read');
      },
    },
    routingKey: {
      type: GraphQLString,
      resolve(parent) {
        if (parent.application) {
          return `${process.env.RABBITMQ_APPLICATION}.${parent.application}.${parent.id}`;
        } else {
          return `${process.env.RABBITMQ_APPLICATION}.${parent.id}`;
        }
      },
    },
  }),
});
