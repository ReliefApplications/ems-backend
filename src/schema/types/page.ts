import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from 'graphql';
import { AccessType, ApplicationType } from '.';
import { ContentEnumType } from '../../const/enumTypes';
import { Application } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export const PageType = new GraphQLObjectType({
  name: 'Page',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    type: { type: ContentEnumType },
    content: { type: GraphQLID },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('update', parent)) {
          return parent.permissions;
        } else {
          const application = await Application.findOne(Application.accessibleBy(ability, 'read').where({ pages: parent._id }).getFilter(), 'id');
          if (application) {
            return parent.permissions;
          }
        }
        return null;
      },
    },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findOne(Application.accessibleBy(ability, 'read').where({ pages: parent._id }).getFilter());
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', parent)) {
          return true;
        } else if (context.user.isAdmin) {
          const application = await Application.findOne(Application.accessibleBy(ability, 'read').where({ pages: parent._id }).getFilter());
          return !!application;
        }
        return false;
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('update', parent)) {
          return true;
        } else if (context.user.isAdmin){
          const application = await Application.findOne(Application.accessibleBy(ability, 'update').where({ pages: parent._id }).getFilter());
          return !!application;
        }
        return false;
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('delete', parent)) {
          return true;
        } else if (context.user.isAdmin){
          const application = await Application.findOne(Application.accessibleBy(ability, 'update').where({ pages: parent._id }).getFilter());
          return !!application;
        }
        return false;
      },
    },
  }),
});
