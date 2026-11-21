import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { Context } from '@server/apollo/context';
import { decodeCursor, encodeCursor } from '@schema/types';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { CustomTemplateConnectionType } from '@schema/types/customTemplate.type';
import { CustomTemplate } from '@models/customTemplate.model';
import { getErrorMessage, getErrorStack } from '@utils/error';

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
 * Query to fetch custom templates for email notification layouts.
 */
export default {
  type: CustomTemplateConnectionType,
  args: {
    applicationId: { type: GraphQLID },
    limit: { type: GraphQLInt, defaultValue: 0 },
    skip: { type: GraphQLInt, defaultValue: 0 },
    isFromEmailNotification: { type: GraphQLBoolean },
    ids: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const query = {
        isDeleted: { $ne: 1 },
        ...(args.ids && { _id: { $in: args.ids } }),
        ...(args.applicationId && { applicationId: args.applicationId }),
        ...(!args.isFromEmailNotification && {
          isFromEmailNotification: { $ne: true },
        }),
      };
      const customTemplates = await CustomTemplate.find(query)
        .sort(SORT_FIELDS[0].sort('desc'))
        .skip(args.skip)
        .limit(args.limit);
      const edges = customTemplates.map((r) => ({
        cursor: encodeCursor(SORT_FIELDS[0].cursorId(r)),
        node: r,
      }));

      return {
        pageInfo: {
          hasNextPage: args.limit > 0 && edges.length === args.limit,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await CustomTemplate.countDocuments(query),
      };
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
