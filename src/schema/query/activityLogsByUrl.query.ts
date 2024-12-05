import { ActivityLog } from '@models';
import { logger } from '@services/logger.service';
import getFilter from '@utils/filter/getFilter';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  decodeCursor,
  encodeCursor,
  ActivityLogsByUrlConnectionType,
} from '../types';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Available filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'createdAt',
    type: 'date',
  },
];

/**
 * GraphQL query to list all activitiesLogs aggregated by URL with count, paginated.
 */
export default {
  type: ActivityLogsByUrlConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args) {
    // Ensure the page size is valid
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);

    try {
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters];

      const cursor = args.afterCursor ? decodeCursor(args.afterCursor) : null;

      const aggregationPipeline: any = [
        { $match: { $and: filters } },
        {
          $group: {
            _id: '$metadata.url',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $facet: {
            paginatedResults: [
              { $skip: cursor ? parseInt(cursor, 10) : 0 },
              { $limit: first + 1 },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const result = await ActivityLog.aggregate(aggregationPipeline);
      const activities = result[0].paginatedResults;
      const hasNextPage = activities.length > first;
      if (hasNextPage) {
        activities.pop(); // Remove the extra document if there is a next page
      }

      const edges = activities.map((activity) => ({
        cursor: encodeCursor(activity._id),
        node: {
          url: activity._id,
          count: activity.count,
        },
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: result[0].totalCount[0] ? result[0].totalCount[0].count : 0,
      };
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(err.message);
    }
  },
};
