import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
} from 'graphql';

import { Dashboard, Page } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';
import { accessibleBy } from '@casl/mongoose';

/** Arguments for the dashboard query */
type DashboardArgs = {
  dashboardId: string | Types.ObjectId;
  templateIds: (string | Types.ObjectId)[];
};

/**
 * Resolves the deletion of multiple dashboard templates.
 *
 * @async
 * @function resolve
 * @param {Object} parent - The parent resolver result.
 * @param {Object} args - The arguments provided to the resolver.
 * @param {string} args.dashboardId - The ID of the main dashboard.
 * @param {string[]} args.templateIds - The IDs of the templates to delete.
 * @param {Context} context - The GraphQL execution context.
 * @returns {Promise<number>} The number of deleted templates.
 * @throws {GraphQLError} If the user does not have permission to delete the templates.
 * @throws {GraphQLError} If the dashboard or associated data cannot be found.
 * @throws {GraphQLError} If an internal server error occurs.
 */
export default {
  type: GraphQLInt,
  args: {
    dashboardId: { type: new GraphQLNonNull(GraphQLID) },
    templateIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
  },
  async resolve(parent, args: DashboardArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const mainDashboard = await Dashboard.findById(args.dashboardId);
      const ability = await extendAbilityForContent(user, mainDashboard);
      const pageAbilityFilter = Page.find(
        accessibleBy(ability, 'read').Page
      ).getFilter();
      const page = await Page.findOne({
        $and: [
          pageAbilityFilter,
          {
            // Matches any contextually linked dashboard
            content: args.dashboardId,
          },
        ],
      });

      if (!page?.context) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      if (ability.cannot('delete', 'Dashboard')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Find and remove the dashboard reference from the page
      if (Array.isArray(page.contentWithContext)) {
        page.contentWithContext = page.contentWithContext.filter(
          (content) => !args.templateIds.includes(content.content.toString())
        );
      }

      page.markModified('contentWithContext');
      await page.save();
      const result = await Dashboard.deleteMany({
        _id: { $in: args.templateIds },
      });
      return result.deletedCount;
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
