import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * Finds dashboard from its id and delete it, if user is authorized.
 * Throws an error if not logged or authorized.
 * NEVER USED IN THE FRONT END AT THE MOMENT
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      const ability: AppAbility = context.user.ability;
      if (ability.can('delete', 'Dashboard')) {
        return await Dashboard.findByIdAndDelete(args.id);
      } else {
        const page = await Page.accessibleBy(ability, 'delete').where({
          content: args.id,
        });
        const step = await Step.accessibleBy(ability, 'delete').where({
          content: args.id,
        });
        if (page || step) {
          return await Dashboard.findByIdAndDelete(args.id);
        }
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
