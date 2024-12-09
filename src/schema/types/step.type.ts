import { accessibleBy } from '@casl/mongoose';
import { ContentEnumType } from '@const/enumTypes';
import { Workflow } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForStep from '@security/extendAbilityForStep';
import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import isNil from 'lodash/isNil';
import { AccessType, WorkflowType } from '.';

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
    icon: { type: GraphQLString },
    showName: {
      type: GraphQLBoolean,
      resolve(parent) {
        const defaultShowName = false;
        return isNil(parent.showName) ? defaultShowName : parent.showName;
      },
    },
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
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const workflow = await Workflow.findOne({
          steps: parent.id,
          ...accessibleBy(ability, 'read').Workflow,
        });
        return workflow;
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForStep(context.user, parent);
        return ability.can('read', parent);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForStep(context.user, parent);
        return ability.can('update', parent);
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForStep(context.user, parent);
        return ability.can('delete', parent);
      },
    },
    buttons: {
      type: GraphQLJSON,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForStep(context.user, parent);
        if (ability.can('update', parent)) {
          return parent.buttons;
        } else {
          return parent.buttons?.filter((button) => {
            if (button.hasRoleRestriction) {
              return context.user.roles?.some((role) =>
                button.roles?.includes(role._id || '')
              );
            } else {
              return true;
            }
          });
        }
      },
    },
  }),
});
