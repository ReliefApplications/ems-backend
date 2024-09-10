import { GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { PullJobConnectionType, encodeCursor, decodeCursor } from '../types';
import { PullJob } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Arguments for the pullJobs query */
type PullJobsArgs = {
  first?: number;
  afterCursor?: string;
};

/**
 * Return all pull jobs available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: PullJobConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
  },
  async resolve(parent, args: PullJobsArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const ability: AppAbility = context.user.ability;
      const abilityFilters = PullJob.find(
        accessibleBy(ability, 'read').PullJob
      ).getFilter();
      const filters: any[] = [abilityFilters];

      const afterCursor = args.afterCursor;
      const cursorFilters = afterCursor
        ? {
            _id: {
              $gt: decodeCursor(afterCursor),
            },
          }
        : {};

      let items: any[] = await PullJob.find({
        $and: [cursorFilters, ...filters],
      })
        .sort({ _id: 1 })
        .limit(first + 1);

      const hasNextPage = items.length > first;
      if (hasNextPage) {
        items = items.slice(0, items.length - 1);
      }
      const edges = items.map((r) => ({
        cursor: encodeCursor(r.id.toString()),
        node: r,
      }));
      return {
        pageInfo: {
          hasNextPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await PullJob.countDocuments({ $and: filters }),
      };
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
