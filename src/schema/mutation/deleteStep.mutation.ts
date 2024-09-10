import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteStep mutation */
type DeleteStepArgs = {
  id: string | Types.ObjectId;
};

/**
 * Delete a step from its id and erase its reference in the corresponding workflow.
 * Delete also the linked dashboard if it has one.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: StepType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteStepArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      const step = await Step.findById(args.id);
      const ability = await extendAbilityForStep(user, step);
      if (ability.cannot('delete', step)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      await step.deleteOne();
      return step;
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
