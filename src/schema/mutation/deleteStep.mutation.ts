import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Dashboard, Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { logger } from '@services/logger.service';
import { statusType } from '@const/enumTypes';

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
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const step = await Step.findById(args.id);
      const ability = await extendAbilityForStep(user, step);
      if (ability.cannot('delete', step)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      if (!!step && !!step.status && step.status === statusType.archived) {
        await step.deleteOne();
        return step;
      } else {
        const dashboards = await Dashboard.findOne({ _id: step.content });
        if (!!dashboards) {
          await Dashboard.findByIdAndUpdate(
            step.content,
            {
              $set: {
                status: statusType.archived,
              },
            },
            { new: true }
          );
        }
        return await Step.findByIdAndUpdate(
          args.id,
          {
            $set: {
              status: statusType.archived,
            },
          },
          { new: true }
        );
      }
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
