import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { unscheduleJob } from '../../server/pullJobScheduler';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Delete a pullJob
 */
export default {
  type: PullJobType,
  args: {
    id: { type: GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;

      const filters = PullJob.accessibleBy(ability, 'delete')
        .where({ _id: args.id })
        .getFilter();
      const pullJob = await PullJob.findOneAndDelete(filters);
      if (!pullJob)
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );

      unscheduleJob(pullJob);
      return pullJob;
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
