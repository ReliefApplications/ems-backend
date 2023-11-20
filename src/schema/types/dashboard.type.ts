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
    structure: {
      type: GraphQLJSON,
      resolve(parent) {
        if (Array.isArray(parent.structure)) {
          return parent.structure;
        } else {
          return [];
        }
      },
    },
    buttons: { type: GraphQLJSON },
    gridOptions: { type: GraphQLJSON },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        const parentId = parent.id || parent._id;
        const ability = await extendAbilityForContent(context.user, parent);
        if (ability.can('update', parent)) {
          const page = await Page.findOne({
            $or: [
              { content: parentId },
              { contentWithContext: { $elemMatch: { content: parentId } } },
            ],
          });
          if (page) return page.permissions;
          const step = await Step.findOne({ content: parentId });
          return step.permissions;
        }
        return null;
      },
    },
    page: {
      type: PageType,
      async resolve(parent, args, context) {
        const parentId = parent.id || parent._id;
        const page = await Page.findOne({
          $or: [
            { content: parentId },
            { contentWithContext: { $elemMatch: { content: parentId } } },
          ],
        });
        if (page) {
          const ability = await extendAbilityForPage(context.user, page);
          if (ability.can('read', page)) {
            return page;
          }
        } else {
          return null;
        }
      },
    },
    step: {
      type: StepType,
      async resolve(parent, args, context) {
        const step = await Step.findOne({ content: parent.id || parent._id });
        if (step) {
          const ability = await extendAbilityForStep(context.user, step);
          if (ability.can('read', step)) {
            return step;
          }
        } else {
          return null;
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
    showFilter: { type: GraphQLBoolean },
    filterVariant: { type: GraphQLString },
    closable: { type: GraphQLBoolean },
  }),
});
