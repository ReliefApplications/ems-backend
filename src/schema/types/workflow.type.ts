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
import { accessibleBy } from '@casl/mongoose';
import { StatusTypeEnumType } from '@const/enumTypes';

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
        const filter = Step.find(
          accessibleBy(ability, 'read').Step
        ).getFilter();
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
    status: { type: StatusTypeEnumType },
  }),
});
