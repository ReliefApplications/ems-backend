import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import { Step, Page, Workflow } from '@models';
import { AccessType, PageType, StepType } from '.';
import extendAbilityForStep from '@security/extendAbilityForStep';
import extendAbilityForContent from '@security/extendAbilityForContent';
import extendAbilityForPage from '@security/extendAbilityForPage';

/** GraphQL Workflow type definition */
export const WorkflowType = new GraphQLObjectType({
  name: 'Workflow',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    steps: {
      type: new GraphQLList(StepType),
      async resolve(parent: Workflow, args, context) {
        const ability = await extendAbilityForStep(context.user, parent);
        const filter = Step.accessibleBy(ability, 'read').getFilter();
        const steps = await Step.aggregate([
          {
            $match: {
              $and: [filter, { _id: { $in: parent.steps } }],
            },
          },
          {
            $addFields: { __order: { $indexOfArray: [parent.steps, '$_id'] } },
          },
          { $sort: { __order: 1 } },
        ]);
        return steps.map((s) => new Step(s));
      },
    },
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
