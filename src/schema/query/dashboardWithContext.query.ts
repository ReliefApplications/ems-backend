import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLID,
  GraphQLObjectType,
} from 'graphql';
import { Dashboard, Page } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';
import { Types } from 'mongoose';
import GraphQLJSON from 'graphql-type-json';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { getContextData } from '@utils/context/getContextData';
import { getNewDashboardName } from '@utils/dashboardWithContext/getNewDashboardName';
import { hasDuplicate } from '@utils/dashboardWithContext/hasDuplicate';

/** Arguments for the getDashboardWithContext mutation */
type GetDashboardWithContextArgs = {
  page: string;
  element?: any;
  record?: string | Types.ObjectId;
};

/**
 * Create a new dashboard with the given context. And adds it to the page.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: new GraphQLObjectType({
    name: 'DashboardWithContext',
    fields: {
      dashboard: { type: DashboardType },
      contextData: { type: GraphQLJSON },
    },
  }),
  args: {
    page: { type: new GraphQLNonNull(GraphQLID) },
    element: { type: GraphQLJSON },
    record: { type: GraphQLID },
  },
  async resolve(parent, args: GetDashboardWithContextArgs, context: Context) {
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

      // Find page, throw error if does not exist
      const abilityFilters = Page.find(
        accessibleBy(ability, 'read').Page
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
      const newName = await getNewDashboardName(
        template,
        page.context,
        args.record || args.element,
        context.dataSources
      );
      // Duplicates the dashboard
      const newDashboard = await new Dashboard({
        name: newName ?? template.name,
        // Copy structure from template dashboard
        structure: template.structure || [],
        createdAt: template.createdAt,
      });
      newDashboard._id = template._id; // /!\ DO NOT SAVE IN DATABASE

      const contextData = await getContextData(
        args.record ? new Types.ObjectId(args.record) : null,
        args.element,
        page,
        context
      );

      return { dashboard: newDashboard, contextData: contextData };
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
