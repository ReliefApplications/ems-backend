import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import { AppAbility } from '@security/defineUserAbility';

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
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (ability.can('delete', 'Dashboard')) {
      return Dashboard.findByIdAndDelete(args.id);
    } else {
      const page = await Page.accessibleBy(ability, 'delete').where({
        content: args.id,
      });
      const step = await Step.accessibleBy(ability, 'delete').where({
        content: args.id,
      });
      if (page || step) {
        return Dashboard.findByIdAndDelete(args.id);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
