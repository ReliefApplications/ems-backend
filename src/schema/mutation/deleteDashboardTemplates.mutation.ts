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
 * Throw GraphQL error if not logged.
 * Returns the dashboard by id if no contextEl is provided.
 * If contextEl is provided and its template already exists, returns the template.
 * If contextEl is provided and its template does not exist:
 *   - if createIfMissing is false, returns the main dashboard with the relevant context
 *   - if createIfMissing is true, creates a new template for the element and returns it (if user has permissions)
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
