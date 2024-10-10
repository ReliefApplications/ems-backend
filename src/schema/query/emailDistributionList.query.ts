import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';
import { GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { Context } from '@server/apollo/context';
import { EmailDistributionList } from '@models';
import { decodeCursor, encodeCursor } from '@schema/types';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { EmailDistributionConnectionType } from '@schema/types/emailDistribution.type';

/** Default page size */
// const DEFAULT_FIRST = 10;

/** Available sort fields */
const SORT_FIELDS = [
  {
    name: 'createdAt',
    cursorId: (node: any) => node.createdAt.getTime().toString(),
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        createdAt: {
          [operator]: decodeCursor(cursor),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        createdAt: getSortOrder(sortOrder),
      };
    },
  },
];

/**
 *
 */
export default {
  type: EmailDistributionConnectionType,
  args: {
    limit: { type: GraphQLInt, defaultValue: 0 },
    skip: { type: GraphQLInt, defaultValue: 0 },
    id: { type: GraphQLID, defaultValue: '' },
    applicationId: { type: GraphQLID },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const query: any = { isDeleted: { $ne: 1 } };

      if (args?.id.length > 0) {
        query._id = args.id;
      }

      if (args?.applicationId) {
        query.applicationId = args.applicationId;
      }

      const emailDistributionLists = await EmailDistributionList.find(query)
        .sort(SORT_FIELDS[0].sort('desc'))
        .skip(args.skip)
        .limit(args.limit);
      const edges = emailDistributionLists.map((r) => ({
        cursor: encodeCursor(SORT_FIELDS[0].cursorId(r)),
        node: r,
      }));

      return {
        pageInfo: {
          hasNextPage: edges.length === args.limit,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await EmailDistributionList.countDocuments(),
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
