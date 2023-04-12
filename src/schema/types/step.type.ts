import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLError
} from 'graphql';
import { AccessType, WorkflowType } from '.';
import { ContentEnumType } from '@const/enumTypes';
import { Workflow } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { logger } from '@services/logger.service';

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
        const workflow = Workflow.findOne({ steps: parent.id }).accessibleBy(
          ability,
          'read'
        );
        if(!workflow){
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }else{
          return workflow;
        }
      },
    },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForStep(context.user, parent);
          return ability.can('read', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForStep(context.user, parent);
          return ability.can('update', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        try{
          const ability = await extendAbilityForStep(context.user, parent);
          return ability.can('delete', parent);
        }catch (err){
          logger.error(err.message, { stack: err.stack });
          throw new GraphQLError(
            context.i18next.t('common.errors.internalServerError')
          );
        }
      },
    },
  }),
});
