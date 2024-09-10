import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import { contentType } from '@const/enumTypes';
import { Page, Step, Dashboard } from '@models';
import { DashboardType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the dashboards query */
type DashboardsArgs = {
  all?: boolean;
};

/**
 * List all dashboards available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(DashboardType),
  args: {
    all: { type: GraphQLBoolean },
  },
  async resolve(parent, args: DashboardsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability = context.user.ability;
      const filters = {};
      if (!args.all) {
        const contentIds = await Page.find({
          type: { $eq: contentType.dashboard },
          content: { $ne: null },
        }).distinct('content');
        const stepIds = await Step.find({
          type: { $eq: contentType.dashboard },
          content: { $ne: null },
        }).distinct('content');
        Object.assign(filters, { _id: { $nin: contentIds.concat(stepIds) } });
      }
      if (ability.can('read', 'Dashboard')) {
        return await Dashboard.find(filters);
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
