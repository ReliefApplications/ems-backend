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
import { Types } from 'mongoose';
import { getContextData } from '@utils/context/getContextData';

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
    buttons: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        if (ability.can('update', parent)) {
          return parent.buttons;
        } else {
          return parent.buttons.filter((button) =>
            context.user.roles?.some((role) =>
              button.visibleToRoles?.includes(role._id || '')
            )
          );
        }
      },
    },
    gridOptions: {
      type: GraphQLJSON,
      resolve(parent) {
        if (parent.gridOptions) {
          return parent.gridOptions;
        } else {
          return {
            minCols: 8,
            maxCols: 8,
            fixedRowHeight: 200,
            margin: 10,
          };
        }
      },
    },
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
    contextData: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        // Check if the parent has context data already
        if (parent.contextData) {
          return parent.contextData;
        }

        // Check if dashboard has context linked to it
        const page = await Page.findOne({
          contentWithContext: { $elemMatch: { content: parent.id } },
        });

        // If no page was found, means the dashboard has no context, return null
        if (!page || !page.context) return null;

        // get the id of the resource or refData
        const contentWithContext = page.contentWithContext.find((c) =>
          (c.content as Types.ObjectId).equals(parent.id)
        );

        // get the id of the resource or refData linked to the dashboard
        const recordId =
          'record' in contentWithContext ? contentWithContext.record : null;
        const elementId =
          'element' in contentWithContext ? contentWithContext.element : null;

        return getContextData(recordId, elementId, page, context);
      },
    },
    filter: { type: GraphQLJSON },
  }),
});
