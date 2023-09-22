import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { unscheduleJob } from '../../server/pullJobScheduler';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * Delete a pullJob
 */
export default {
  type: PullJobType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;

      const filters = PullJob.find(accessibleBy(ability, 'delete').PullJob)
        .where({ _id: args.id })
        .getFilter();
      const pullJob = await PullJob.findOneAndDelete(filters);
      if (!pullJob)
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );

      unscheduleJob(pullJob);
      return pullJob;
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
