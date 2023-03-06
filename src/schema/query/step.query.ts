import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';

/**
 * Returns step from id if available for the logged user.
 * Throw GraphQL error if not logged.
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

    // get data and check permissions
    const step = await Step.findById(args.id);
    const ability = await extendAbilityForStep(user, step);
    if (ability.cannot('read', step)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    return step;
  },
};
