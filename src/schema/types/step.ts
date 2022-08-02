import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import { AccessType, WorkflowType } from '.';
import { ContentEnumType } from '../../const/enumTypes';
import { Workflow } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

/** GraphQL Step type definition */
export const StepType = new GraphQLObjectType({
  name: 'Step',
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
    // TODO: doesn't work
    permissions: {
      type: AccessType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    workflow: {
      type: WorkflowType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Workflow.findOne({ steps: parent.id }).accessibleBy(
          ability,
          'read'
        );
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', parent)) {
          return true;
        } else if (context.user.isAdmin) {
          const workflow = await Workflow.findOne({ steps: parent._id }, 'id');
          return canAccessContent(workflow.id, 'read', ability);
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
        } else if (context.user.isAdmin) {
          const workflow = await Workflow.findOne({ steps: parent._id }, 'id');
          return canAccessContent(workflow.id, 'update', ability);
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
        } else if (context.user.isAdmin) {
          const workflow = await Workflow.findOne({ steps: parent._id }, 'id');
          return canAccessContent(workflow.id, 'delete', ability);
        }
        return false;
      },
    },
  }),
});
