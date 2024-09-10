import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { DashboardType } from '../types';
import { Dashboard, Page } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';
import GraphQLJSON from 'graphql-type-json';
import { accessibleBy } from '@casl/mongoose';
import { getNewDashboardName } from '@utils/context/getNewDashboardName';
import { getContextData } from '@utils/context/getContextData';

/** Arguments for the dashboard query */
type DashboardArgs = {
  id: string | Types.ObjectId;
  contextEl: any;
  createIfMissing: boolean;
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
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    contextEl: { type: GraphQLJSON },
    createIfMissing: { type: GraphQLBoolean },
  },
  async resolve(parent, args: DashboardArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // get data and check permissions
      const mainDashboard = await Dashboard.findById(args.id);
      const ability = await extendAbilityForContent(user, mainDashboard);
      if (ability.cannot('read', mainDashboard)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // If no contextEl is provided, we return the main dashboard
      if (!args.contextEl) {
        return mainDashboard;
      }

      // Check if contextEl is valid
      if (
        args.contextEl &&
        !['string', 'number'].includes(typeof args.contextEl)
      )
        throw new GraphQLError(
          context.i18next.t(
            'mutations.dashboard.addWithContext.errors.invalidElement'
          )
        );

      const pageAbilityFilter = Page.find(
        accessibleBy(ability, 'read').Page
      ).getFilter();

      // Else we get the dashboard with respect to the context
      // Get the page that contains this dashboard
      const page = await Page.findOne({
        $and: [
          pageAbilityFilter,
          {
            $or: [
              {
                // Matches any contextually linked dashboard
                contentWithContext: { $elemMatch: { content: args.id } },
              },
              // Matches the main dashboard
              { content: args.id },
            ],
          },
        ],
      });

      if (!page?.context) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // We look through the array of contentWithContext to find the one that matches the contextEl
      const contentWithContext = (page.contentWithContext ?? []).find((c) => {
        if ('record' in c && c.record) {
          return typeof c.record === 'string'
            ? c.record === args.contextEl
            : c.record.equals(args.contextEl);
        } else if ('element' in c && c.element) {
          return c.element === args.contextEl;
        }
      });

      // If we found a match, we return the dashboard
      if (contentWithContext) {
        const dashboard = await Dashboard.findById(contentWithContext.content);
        return dashboard;
      } else {
        // We check if it's a valid contextEl
        const type =
          'resource' in page.context && page.context.resource
            ? 'record'
            : 'element';

        // If we did not find a match, and the createIfMissing flag is not set
        // we return the main dashboard with the relevant context
        if (!args.createIfMissing) {
          const contextData = await getContextData(
            type === 'record' ? args.contextEl : undefined,
            type === 'element' ? args.contextEl : undefined,
            page,
            context
          );

          Object.assign(mainDashboard, {
            contextData: {
              id: args.contextEl,
              ...contextData,
            },
            name: await getNewDashboardName(
              mainDashboard,
              page.context,
              args.contextEl,
              context.dataSources
            ),
          });
          return mainDashboard;
        }
        // Else, we create a new template for the element

        // We check for user permissions
        const canCreateDashboard = ability.can('create', 'Dashboard');
        const canUpdatePage = ability.can('update', page);
        if (!canCreateDashboard || !canUpdatePage) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }

        // If we did not find a match, we create a new dashboard
        const newDashboard = new Dashboard({
          name: await getNewDashboardName(
            mainDashboard,
            page.context,
            args.contextEl,
            context.dataSources
          ),
          // Copy structure from the main dashboard
          structure: mainDashboard.structure || [],
        });

        await newDashboard.save();

        const newContentWithContext = {
          ['resource' in page.context && page.context.resource
            ? 'record'
            : 'element']: args.contextEl,
          content: newDashboard._id,
        } as Page['contentWithContext'][number];

        // Adds the dashboard to the page
        if (Array.isArray(page.contentWithContext)) {
          page.contentWithContext.push(newContentWithContext);
        } else {
          page.contentWithContext = [newContentWithContext];
        }

        page.markModified('contentWithContext');
        await page.save();

        return newDashboard;
      }
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

// todo: reactivate if we want to inject context in dashboard
// Check if dashboard has context linked to it
// const page = await Page.findOne({
//   contentWithContext: { $elemMatch: { content: args.id } },
// });

// If a page was found, means the dashboard has context
// if (page && page.context) {
//   // get the id of the resource or refData
//   const contentWithContext = page.contentWithContext.find((c) =>
//     (c.content as Types.ObjectId).equals(args.id)
//   );
//   const id =
//     'element' in contentWithContext && contentWithContext.element
//       ? contentWithContext.element
//       : 'record' in contentWithContext && contentWithContext.record
//       ? contentWithContext.record
//       : null;

//   const ctx = page.context;
//   let data: any;

//   if ('resource' in ctx && ctx.resource) {
//     const record = await Record.findById(id);
//     data = record.data;
//   } else if ('refData' in ctx && ctx.refData) {
//     // get refData from page
//     const referenceData = await ReferenceData.findById(ctx.refData);
//     const apiConfiguration = await ApiConfiguration.findById(
//       referenceData.apiConfiguration
//     );
//     const items = apiConfiguration
//       ? await (
//           context.dataSources[apiConfiguration.name] as CustomAPI
//         ).getReferenceDataItems(referenceData, apiConfiguration)
//       : referenceData.data;
//     data = items.find((x) => x[referenceData.valueField] === id);
//   }

//   const stringifiedStructure = JSON.stringify(dashboard.structure);
//   const regex = /{{context\.(.*?)}}/g;

//   // replace all {{context.<field>}} with the value from the data
//   dashboard.structure = JSON.parse(
//     stringifiedStructure.replace(regex, (match) => {
//       const field = match.replace('{{context.', '').replace('}}', '');
//       return data[field] || match;
//     })
//   );
// }
