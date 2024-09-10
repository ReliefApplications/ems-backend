import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { unscheduleJob } from '../../server/pullJobScheduler';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deletePullJob mutation */
type DeletePullJobArgs = {
  id: string | Types.ObjectId;
};

/**
 * Delete a pullJob
 */
export default {
  type: PullJobType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeletePullJobArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;

      const filters = PullJob.find(accessibleBy(ability, 'delete').PullJob)
        .where({ _id: args.id })
        .getFilter();
      const pullJob = await PullJob.findOneAndDelete(filters);
      if (!pullJob.ok)
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );

      unscheduleJob(pullJob.value);
      return pullJob.value;
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
