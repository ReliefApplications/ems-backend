import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLError,
  GraphQLID,
} from 'graphql';
import { Dashboard, Page } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';

/**
 * Create a new dashboard with the given context. And adds it to the page.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    page: { type: new GraphQLNonNull(GraphQLID) },
    element: { type: GraphQLString },
    record: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // Check arguments
    if ((!args.element && !args.record) || (args.element && args.record)) {
      throw new GraphQLError(
        context.i18next.t(
          'mutations.dashboard.addWithContext.errors.invalidArguments'
        )
      );
    }

    // Check if the user can create a dashboard
    const ability: AppAbility = user.ability;
    if (ability.cannot('create', 'Dashboard'))
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );

    const abilityFilters = Page.accessibleBy(ability, 'read').getFilter();
    const page = await Page.findOne({
      _id: args.page,
      ...abilityFilters,
    });

    if (!page)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));

    // Check if page type is dashboard
    if (page.type !== 'dashboard')
      throw new GraphQLError(
        context.i18next.t('mutations.dashboard.add.errors.invalidPageType')
      );

    // Fetches the dashboard from the page
    const dashboard = await Dashboard.findById(page.content);

    // Duplicates the dashboard
    const newDashboard = await new Dashboard({
      name: `${dashboard.name}/${args.element || args.record}`,
      structure: dashboard.structure || [],
    }).save();

    const newContentWithContext = args.record
      ? ({
          record: args.record,
          content: newDashboard._id,
        } as Page['contentWithContext'][number])
      : ({
          element: args.element,
          content: newDashboard._id,
        } as Page['contentWithContext'][number]);

    // Adds the dashboard to the page
    page.contentWithContext.push(newContentWithContext);
    await page.save();

    return newDashboard;
  },
};
