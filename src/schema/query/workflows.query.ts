import { GraphQLList, GraphQLError } from 'graphql';
import { Workflow } from '@models';
import { WorkflowType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';

/**
 * List all workflows available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(WorkflowType),
  resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    try {
      const ability: AppAbility = context.user.ability;
      return Workflow.accessibleBy(ability, 'read');
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
