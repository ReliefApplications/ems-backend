import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { unscheduleJob } from '../../server/pullJobScheduler';

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
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
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
  },
};
