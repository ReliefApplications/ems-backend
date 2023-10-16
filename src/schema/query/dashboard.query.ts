import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import { Dashboard } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { Types } from 'mongoose';

/** Arguments for the dashboard query */
type DashboardArgs = {
  id: string | Types.ObjectId;
};

/**
 * Return dashboard from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DashboardArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // get data and check permissions
      const dashboard = await Dashboard.findById(args.id);
      const ability = await extendAbilityForContent(user, dashboard);
      if (ability.cannot('read', dashboard)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
      return dashboard;
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
