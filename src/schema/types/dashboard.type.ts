import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, PageType, StepType } from '.';
import { Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import extendAbilityForPage from '@security/extendAbilityForPage';
import extendAbilityForStep from '@security/extendAbilityForStep';

/** GraphQL dashboard type definition */
export const DashboardType = new GraphQLObjectType({
  name: 'Dashboard',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    structure: { type: GraphQLJSON },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        if (ability.can('update', parent)) {
          const page = await Page.findOne({ content: parent.id });
          if (page) return page.permissions;
          const step = await Step.findOne({ content: parent.id });
          return step.permissions;
        }
        return null;
      },
    },
    page: {
      type: PageType,
      async resolve(parent, args, context) {
        const page = await Page.findOne({ content: parent.id });
        const ability = await extendAbilityForPage(context.user, page);
        if (ability.can('read', page)) {
          return page;
        }
      },
    },
    step: {
      type: StepType,
      async resolve(parent, args, context) {
        const step = await Step.findOne({ content: parent.id });
        const ability = await extendAbilityForStep(context.user, step);
        if (ability.can('read', step)) {
          return step;
        }
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('read', parent);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('update', parent);
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('delete', parent);
      },
    },
  }),
});
