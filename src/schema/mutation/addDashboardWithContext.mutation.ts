import { GraphQLNonNull, GraphQLError, GraphQLID } from 'graphql';
import { Dashboard, Page } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';
import { Types } from 'mongoose';
import GraphQLJSON from 'graphql-type-json';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { hasDuplicate } from '@utils/dashboardWithContext/hasDuplicate';
import { getNewDashboardName } from '@utils/dashboardWithContext/getNewDashboardName';

/** Arguments for the addDashboardWithContext mutation */
type AddDashboardWithContextArgs = {
  page: string;
  element?: any;
  record?: string | Types.ObjectId;
};

/**
 * Create a new dashboard with the given context. And adds it to the page.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    page: { type: new GraphQLNonNull(GraphQLID) },
    element: { type: GraphQLJSON },
    record: { type: GraphQLID },
  },
  async resolve(parent, args: AddDashboardWithContextArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Check arguments
      if ((!args.element && !args.record) || (args.element && args.record)) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.dashboard.addWithContext.errors.invalidArguments'
          )
        );
      }

      // Check if element is valid
      if (args.element && !['string', 'number'].includes(typeof args.element))
        throw new GraphQLError(
          context.i18next.t(
            'mutations.dashboard.addWithContext.errors.invalidElement'
          )
        );

      // Check if the user can create a dashboard
      const ability: AppAbility = user.ability;
      if (ability.cannot('create', 'Dashboard'))
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );

      // Find page, throw error if does not exist
      const abilityFilters = Page.find(
        accessibleBy(ability, 'update').Page
      ).getFilter();
      const page = await Page.findOne({
        _id: args.page,
        ...abilityFilters,
      });
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // Check if page type is dashboard
      if (page.type !== 'dashboard') {
        throw new GraphQLError(
          context.i18next.t('mutations.dashboard.add.errors.invalidPageType')
        );
      }

      // Check if same configuration already exists
      if (
        hasDuplicate(page.context, page.contentWithContext, {
          ...(args.record && { record: args.record }),
          ...(args.element && { element: args.element }),
        })
      ) {
        throw new GraphQLError(
          context.i18next.t('mutations.dashboard.add.errors.invalidPageType')
        );
      }

      // Fetches the dashboard from the page
      const template = await Dashboard.findById(page.content);
      // Duplicates the dashboard
      const newDashboard = await new Dashboard({
        name: await getNewDashboardName(
          template,
          page.context,
          args.record || args.element,
          context.dataSources
        ),
        // Copy structure from template dashboard
        structure: template.structure || [],
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
