import { ActivityLog } from '@models';
import { logger } from '@services/logger.service';
import getFilter from '@utils/filter/getFilter';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { GraphQLError, GraphQLID, GraphQLInt, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';
import { CompositeFilterDescriptor } from 'types/filter';
import {
  ActivityLogConnectionType,
  decodeCursor,
  encodeCursor,
} from '../types';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';

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
    sort: (sortOrder: string) => {
      return {
        createdAt: getSortOrder(sortOrder),
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
 * GraphQL query to list all activity logs.
 */
export default {
  type: ActivityLogConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    userId: { type: GraphQLString },
    applicationId: { type: GraphQLString },
  },
  async resolve(
    parent,
    args: ActivityLogsArgs & { userId?: string; applicationId?: string }
  ) {
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);

    try {
      const queryConditions: { [key: string]: any } = {};
      if (args.userId) queryConditions.userId = args.userId;
      if (args.applicationId)
        queryConditions['metadata.applicationId'] = args.applicationId;

      const queryFilters = getFilter(args.filter, FILTER_FIELDS);

      // Ensure queryFilters is an object or valid array
      const filters: any[] = Array.isArray(queryFilters)
        ? queryFilters
        : [queryFilters];

      const afterCursor = args.afterCursor;
      const sortField = SORT_FIELDS[0];
      const sortOrder = 'desc';
      const cursorFilters = afterCursor
        ? sortField.cursorFilter(afterCursor, sortOrder)
        : {};

      // Construct conditions and avoid empty $and
      const andConditions = [cursorFilters, ...filters, queryConditions].filter(
        (condition) => condition && Object.keys(condition).length > 0
      );

      // If no conditions are present, match all documents
      const mongoQuery =
        andConditions.length > 0 ? { $and: andConditions } : {};

      let activities = await ActivityLog.find(mongoQuery)
        .sort(sortField.sort(sortOrder))
        .limit(first + 1);

      const hasNextPage = activities.length > first;
      if (hasNextPage) {
        activities = activities.slice(0, activities.length - 1);
      }

      const edges = activities.map((r) => ({
        cursor: encodeCursor(sortField.cursorId(r)),
        node: r,
      }));

      return {
        pageInfo: {
          hasNextPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await ActivityLog.countDocuments(mongoQuery),
      };
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(err.message);
    }
  },
};
