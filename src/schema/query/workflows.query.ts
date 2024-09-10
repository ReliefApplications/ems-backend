import { GraphQLList, GraphQLError } from 'graphql';
import { Workflow } from '@models';
import { WorkflowType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/**
 * List all workflows available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(WorkflowType),
  resolve(parent, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const workflows = Workflow.find(accessibleBy(ability, 'read').Workflow);
      return workflows;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
