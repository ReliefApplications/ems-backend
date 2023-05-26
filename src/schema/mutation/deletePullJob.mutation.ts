import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { unscheduleJob } from '../../server/pullJobScheduler';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * Delete a pullJob
 */
export default {
  type: PullJobType,
  args: {
    id: { type: GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      const ability: AppAbility = user.ability;

      const filters = PullJob.accessibleBy(ability, 'delete')
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
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
