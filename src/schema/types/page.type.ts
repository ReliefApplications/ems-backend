import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { AccessType, ApplicationType } from '.';
import { ContentEnumType } from '@const/enumTypes';
import { Application, Page } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { isNil } from 'lodash';
import { accessibleBy } from '@casl/mongoose';
import { GraphQLDate } from 'graphql-scalars';
import config from 'config';

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
    icon: { type: GraphQLString },
    visible: {
      type: GraphQLBoolean,
      resolve(parent) {
        return isNil(parent.visible) ? true : parent.visible;
      },
    },
    showName: {
      type: GraphQLBoolean,
      resolve(parent) {
        const defaultShowName = parent.type === 'workflow' ? true : false;
        return isNil(parent.showName) ? defaultShowName : parent.showName;
      },
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    type: { type: ContentEnumType },
    content: { type: GraphQLID },
    context: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForPage(context.user, parent);
        if (ability.can('read', parent))
          return parent.context?.displayField ? parent.context : null;
        return null;
      },
    },
    contentWithContext: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForPage(context.user, parent);
        if (ability.can('read', parent)) return parent.contentWithContext;
        return null;
      },
    },
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
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const app = await Application.findOne(
          Application.find(accessibleBy(ability, 'read').Application)
            .where({ pages: parent._id })
            .getFilter()
        );
        return app;
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
    autoDeletedAt: {
      type: GraphQLDate,
      resolve(parent: Page) {
        const date = new Date(parent.archivedAt);
        date.setSeconds(
          date.getSeconds() + Number(config.get<string>('archive.expires'))
        );
        return date;
      },
    },
  }),
});
