import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLID,
  GraphQLObjectType,
} from 'graphql';
import {
  ApiConfiguration,
  Dashboard,
  Page,
  PageContextT,
  Record,
  ReferenceData,
} from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';
import { Types } from 'mongoose';
import { CustomAPI } from '@server/apollo/dataSources';
import GraphQLJSON from 'graphql-type-json';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { get, isNil } from 'lodash';
import { getContextData } from '@utils/context/getContextData';

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

    const item = data.find((x) => get(x, referenceData.valueField) == id);
    return `${item?.[context.displayField]}`;
  } else if ('resource' in context && context.resource) {
    const record = await Record.findById(id);
    return `${record.data[context.displayField]}`;
  }

  // Default return, should never happen
  return dashboard.name;
};

/**
 * Check if context is duplicated in the page, to avoid creating multiple similar templates.
 *
 * @param context page context
 * @param contentWithContext list of contextual templates
 * @param entry new entry
 * @param entry.element new element ( if ref data )
 * @param entry.record new record ( if resource )
 * @returns is entry duplicated or not
 */
const hasDuplicate = (
  context: PageContextT,
  contentWithContext: Page['contentWithContext'],
  entry: {
    element?: any;
    record?: string | Types.ObjectId;
  }
) => {
  const uniqueEntries = new Set();
  if (!isNil(get(context, 'resource'))) {
    for (const item of contentWithContext) {
      if (get(item, 'record')) {
        uniqueEntries.add((item as any).record.toString());
      }
    }
    if (uniqueEntries.has(entry.record.toString())) {
      return true;
    }
  } else {
    for (const item of contentWithContext) {
      if (get(item, 'element')) {
        uniqueEntries.add((item as any).element.toString());
      }
    }
    if (uniqueEntries.has(entry.element.toString())) {
      return true;
    }
  }
  return false;
};

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
