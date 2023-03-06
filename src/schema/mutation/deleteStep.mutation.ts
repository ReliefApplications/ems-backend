import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';

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
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const step = await Step.findById(args.id);
    const ability = await extendAbilityForStep(user, step);
    if (ability.cannot('delete', step)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    await step.deleteOne();
    return step;
  },
};
