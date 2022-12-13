import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import { Dashboard } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';

/**
 * Return dashboard from id if available for the logged user.
 * Throw GraphQL error if not logged.
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

    // get data and check permissions
    const dashboard = await Dashboard.findById(args.id);
    const ability = await extendAbilityForContent(user, dashboard);
    if (ability.cannot('read', dashboard)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    return dashboard;
  },
};
