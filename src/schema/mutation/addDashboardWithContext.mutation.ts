import { GraphQLNonNull, GraphQLError, GraphQLID } from 'graphql';
import {
  ApiConfiguration,
  Dashboard,
  Page,
  Record,
  ReferenceData,
} from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';
import { Types } from 'mongoose';
import { CustomAPI } from '@server/apollo/dataSources';
import GraphQLJSON from 'graphql-type-json';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Get the name of the new dashboard, based on the context.
 *
 * @param dashboard The dashboard being duplicated
 * @param context The context of the dashboard
 * @param id The id of the record or element
 * @param dataSources The data sources
 * @returns The name of the new dashboard
 */
const getNewDashboardName = async (
  dashboard: Dashboard,
  context: Page['context'],
  id: string | Types.ObjectId,
  dataSources: any
) => {
  if ('refData' in context && context.refData) {
    // Get items from reference data
    const referenceData = await ReferenceData.findById(context.refData);
    const apiConfiguration = await ApiConfiguration.findById(
      referenceData.apiConfiguration
    );
    const data = apiConfiguration
      ? await (
          dataSources[apiConfiguration.name] as CustomAPI
        ).getReferenceDataItems(referenceData, apiConfiguration)
      : referenceData.data;

    const item = data.find((x) => x[referenceData.valueField] === id);
    return `${dashboard.name} (${item?.[context.displayField]})`;
  } else if ('resource' in context && context.resource) {
    const record = await Record.findById(id);
    return `${dashboard.name} (${record.data[context.displayField]})`;
  }

  // Default return, should never happen
  return dashboard.name;
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
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      // Check arguments
      if ((!args.element && !args.record) || (args.element && args.record)) {
        throw new GraphQLHandlingError(
          context.i18next.t(
            'mutations.dashboard.addWithContext.errors.invalidArguments'
          )
        );
      }

      // Check if element is valid
      if (args.element && !['string', 'number'].includes(typeof args.element))
        throw new GraphQLHandlingError(
          context.i18next.t(
            'mutations.dashboard.addWithContext.errors.invalidElement'
          )
        );

      // Check if the user can create a dashboard
      const ability: AppAbility = user.ability;
      if (ability.cannot('create', 'Dashboard'))
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );

      const abilityFilters = Page.accessibleBy(ability, 'read').getFilter();
      const page = await Page.findOne({
        _id: args.page,
        ...abilityFilters,
      });

      if (!page)
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.dataNotFound')
        );

      // Check if page type is dashboard
      if (page.type !== 'dashboard')
        throw new GraphQLHandlingError(
          context.i18next.t('mutations.dashboard.add.errors.invalidPageType')
        );

      // Fetches the dashboard from the page
      const dashboard = await Dashboard.findById(page.content);

      // Duplicates the dashboard
      const newDashboard = await new Dashboard({
        name: await getNewDashboardName(
          dashboard,
          page.context,
          args.record || args.element,
          context.dataSources
        ),
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
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
