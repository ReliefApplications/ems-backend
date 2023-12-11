import { GraphQLNonNull, GraphQLError, GraphQLID, GraphQLString } from 'graphql';
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
  geographicContext: string,
  dataSources: any
) => {
  if ('refData' in context && context.refData && id) {
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
    if (geographicContext) {
      return `${item?.[context.displayField]} - ${geographicContext}`;
    }
    return `${item?.[context.displayField]}`;
  } else if ('resource' in context && context.resource && id) {
    const record = await Record.findById(id);
    if (geographicContext) {
      return `${record.data[context.displayField]} - ${geographicContext}`;
    }
    return `${record.data[context.displayField]}`;
  }
  // Default return
  if (geographicContext) {
    return `${dashboard.name} - ${geographicContext}`;
  }
  return `${dashboard.name}`;

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
    geographic?: string;
  }
) => {
  const uniqueEntries = new Set();

  if ('geographic' in entry && 'geography') {
    // record and geographic
    if ('record' in entry) {
      const contains = contentWithContext.some((item: any) => item.record === entry.record && item.geographic === entry.geographic);
      if (contains) {
        return true;
      }
    // element and geographic
    } else if ('element' in entry) {
      const contains = contentWithContext.some((item: any) => item.element === entry.element && item.geographic === entry.geographic);
      if (contains) {
        return true;
      }
    // geographic
    } else {
      for (const item of contentWithContext) {
        if (get(item, 'geographic')) {
          uniqueEntries.add((item as any).geographic.toString());
        }
      }
      if (uniqueEntries.has(entry.geographic.toString())) {
        return true;
      }
    }
  // record or element
  } else {
    if (!isNil(get(context, 'resource'))) {
      for (const item of contentWithContext) {
        if (get(item, 'record')) {
          uniqueEntries.add((item as any).record.toString());
        }
      }
      if (uniqueEntries.has(entry.record.toString())) {
        return true;
      }
    } else if (!isNil(get(context, 'element'))) {
      for (const item of contentWithContext) {
        if (get(item, 'element')) {
          uniqueEntries.add((item as any).element.toString());
        }
      }
      if (uniqueEntries.has(entry.element.toString())) {
        return true;
      }
    }
  }
  return false;
};

/** Arguments for the addDashboardWithContext mutation */
type AddDashboardWithContextArgs = {
  page: string;
  element?: any;
  record?: string | Types.ObjectId;
  geographic?: string;
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
    geographic: { type: GraphQLString }
  },
  async resolve(parent, args: AddDashboardWithContextArgs, context: Context) {  
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Check arguments
      if (
        (!args.element && !args.record && !args.geographic) ||
        (args.element && args.record && args.geographic) &&
        (args.element && args.record)
      ) {
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
          ...(args.geographic && { geographic: args.geographic })
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
          args.geographic,
          context.dataSources
        ),
        // Copy structure from template dashboard
        structure: template.structure || [],
      }).save();      
      let newContentWithContext: any;
      if (args.record && !args.geographic) {
        newContentWithContext = ({
            record: args.record,
            content: newDashboard._id,
          } as Page['contentWithContext'][number])
      } else if (args.element && !args.geographic){
        newContentWithContext = ({
            element: args.element,
            content: newDashboard._id,
          } as Page['contentWithContext'][number]);
      } else if (args.record && args.geographic) {
        newContentWithContext = ({
          record: args.record,
          geographic: args.geographic,
          content: newDashboard._id,
        } as Page['contentWithContext'][number]);
      } else if (args.element && args.geographic) {
        newContentWithContext = ({
          element: args.element,
          geographic: args.geographic,
          content: newDashboard._id,
        } as Page['contentWithContext'][number]);
      } else {
        newContentWithContext = ({
          geographic: args.geographic,
          content: newDashboard._id,
        } as Page['contentWithContext'][number]);
      }
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
