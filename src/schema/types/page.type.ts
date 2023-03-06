import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { AccessType, ApplicationType } from '.';
import { ContentEnumType } from '@const/enumTypes';
import { Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/** GraphQL page type type definition */
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
        const ability = await extendAbilityForPage(context.user, parent);
        if (ability.can('update', parent)) {
          return parent.permissions;
        }
        return null;
      },
    },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findOne(
          Application.accessibleBy(ability, 'read')
            .where({ pages: parent._id })
            .getFilter()
        );
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForPage(context.user, parent);
        return ability.can('read', parent);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForPage(context.user, parent);
        return ability.can('update', parent);
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForPage(context.user, parent);
        return ability.can('delete', parent);
      },
    },
  }),
});
