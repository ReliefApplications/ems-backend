import { ActivityLog } from '@models';
import { logger } from '@services/logger.service';
import getFilter from '@utils/filter/getFilter';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';
import { CompositeFilterDescriptor } from 'types/filter';
import {
  ActivityLogConnectionType,
  decodeCursor,
  encodeCursor,
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
  },
];

/** Arguments for the activity logs query */
type ActivityLogsArgs = {
  first?: number;
  afterCursor?: string | Types.ObjectId;
  filter?: CompositeFilterDescriptor;
};

/**
 * GraphQL query to list all activitiesLogs.
 */
export default {
  type: ActivityLogConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args: ActivityLogsArgs) {
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters];

      const afterCursor = args.afterCursor;
      const cursorFilters = afterCursor
        ? SORT_FIELDS[0].cursorFilter(afterCursor, 'asc')
        : {};

      let activities = await ActivityLog.find({
        $and: [cursorFilters, ...filters],
      }).limit(first + 1);

      const hasNextPage = activities.length > first;
      if (hasNextPage) {
        activities = activities.slice(0, activities.length - 1);
      }

      const edges = activities.map((r) => ({
        cursor: encodeCursor(SORT_FIELDS[0].cursorId(r)),
        node: r,
      }));

      return {
        pageInfo: {
          hasNextPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await ActivityLog.countDocuments({ $and: filters }),
      };
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(err.message);
    }
  },
};
