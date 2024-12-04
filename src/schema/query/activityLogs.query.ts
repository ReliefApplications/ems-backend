import { ActivityLog } from '@models';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import getFilter from '@utils/filter/getFilter';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { GraphQLError, GraphQLID, GraphQLInt, GraphQLString } from 'graphql';
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
    name: 'username',
    cursorId: (node: any) =>
      (node.username || '') + ';;' + node.createdAt.getTime().toString(),
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      const value = decodeCursor(cursor).split(';;')[0];
      const date = decodeCursor(cursor).split(';;')[1];
      return {
        $or: [
          {
            username: { [operator]: value },
          },
          {
            username: { $eq: value },
            createdAt: { [operator]: date },
          },
        ],
      };
    },
    sort: (sortOrder: string) => {
      return {
        username: getSortOrder(sortOrder),
      };
    },
  },
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
  sortField?: string;
  sortOrder?: string;
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
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args: ActivityLogsArgs, context: Context) {
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      let attributesSortFields = [];
      if (args.sortField) {
        /** Include attributes sort fields */
        const userAttributes = Object.keys(context.user.attributes || {});
        attributesSortFields = userAttributes.map((attribute) => {
          return {
            name: attribute,
            cursorId: (node: any) =>
              (node.attributes?.[attribute] || '') +
              ';;' +
              node.createdAt.getTime().toString(),
            cursorFilter: (cursor: any, sortOrder: string) => {
              const operator = sortOrder === 'asc' ? '$gt' : '$lt';
              const value = decodeCursor(cursor).split(';;')[0];
              const date = decodeCursor(cursor).split(';;')[1];
              return {
                $or: [
                  {
                    [`attributes.${attribute}`]: {
                      [operator]: value,
                    },
                  },
                  {
                    [`attributes.${attribute}`]: {
                      $eq: value,
                    },
                    createdAt: { [operator]: date },
                  },
                ],
              };
            },
            sort: (sortOrder: string) => {
              return {
                [`attributes.${attribute}`]: getSortOrder(sortOrder),
              };
            },
          };
        });
      }
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters];
      const SORT_FIELDS_WITH_ATTRIBUTES = [
        ...SORT_FIELDS,
        ...attributesSortFields,
      ];
      const sortField =
        SORT_FIELDS_WITH_ATTRIBUTES.find((x) => x.name === args.sortField) ||
        SORT_FIELDS.find((x) => x.name === 'createdAt');
      const sortOrder = args.sortOrder || 'desc';
      const afterCursor = args.afterCursor;
      const cursorFilters = afterCursor
        ? sortField.cursorFilter(afterCursor, sortOrder)
        : {};

      let activities = await ActivityLog.find({
        $and: [cursorFilters, ...filters],
      })
        .sort(sortField.sort(sortOrder))
        .limit(first + 1);

      const hasNextPage = activities.length > first;
      if (hasNextPage) {
        activities = activities.slice(0, activities.length - 1);
      }

      const edges = activities.map((r) => {
        return {
          cursor: encodeCursor(sortField.cursorId(r)),
          node: r,
        };
      });

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
