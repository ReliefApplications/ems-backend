import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
  /*  Returns dashboard from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const dashboard = await Dashboard.findOne(
      Dashboard.accessibleBy(ability).where({ _id: args.id }).getFilter()
    );
    if (!dashboard) {
      // If user is admin and can see parent application, it has access to it
      if (user.isAdmin) {
        if (await canAccessContent(args.id, 'read', ability)) {
          return Dashboard.findById(args.id);
        }
      } else {
        const filterStep = Step.accessibleBy(ability)
          .where({ content: args.id })
          .getFilter();
        const filterPage = Page.accessibleBy(ability)
          .where({ content: args.id })
          .getFilter();
        const step = await Step.findOne(filterStep, 'id');
        const page = await Page.findOne(filterPage, 'id');
        if (page || step) {
          return Dashboard.findById(args.id);
        }
      }
    } else {
      return dashboard;
    }
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
