import { GraphQLError, GraphQLList } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * List all steps available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(StepType),
  resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      return Step.find(accessibleBy(ability, 'read').Step);
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
