import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { StepType } from '../types';
import { Step } from '@models';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the step query */
type StepArgs = {
  id: string | Types.ObjectId;
};

/**
 * Returns step from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: StepType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: StepArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // get data and check permissions
      const step = await Step.findById(args.id);
      const ability = await extendAbilityForStep(user, step);
      if (ability.cannot('read', step)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

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
