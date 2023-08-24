import { GraphQLError, GraphQLList } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * List all steps available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(StepType),
  resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = context.user.ability;
      return Step.accessibleBy(ability, 'read');
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
