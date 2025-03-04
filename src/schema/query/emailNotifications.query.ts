import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';
import { GraphQLError, GraphQLID, GraphQLInt, GraphQLNonNull } from 'graphql';
import { Context } from '@server/apollo/context';
import { EmailNotification } from '@models';
import {
  EmailNotificationConnectionType,
  decodeCursor,
  encodeCursor,
} from '@schema/types';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { accessibleBy } from '@casl/mongoose';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/** Default page size */
// const DEFAULT_FIRST = 10;

export interface EmailNotificationReturn extends EmailNotification {
  userSubscribed: boolean;
}

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
 * Resolves the email notifications flow.
 */
export default {
  type: EmailNotificationConnectionType,
  args: {
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
    limit: { type: GraphQLInt, defaultValue: 0 },
    skip: { type: GraphQLInt, defaultValue: 0 },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = extendAbilityForApplications(
        context.user,
        args.applicationId
      );
      const abilityFilters = EmailNotification.find(
        accessibleBy(ability, 'read').EmailNotification
      ).getFilter();

      const filters: any[] = [
        {
          // isDeleted: { $ne: 1 },
          applicationId: args.applicationId,
        },
        abilityFilters,
      ];

      const items = await EmailNotification.find({
        $and: filters,
      })
        .sort(SORT_FIELDS[0].sort('desc'))
        .skip(args.skip)
        .limit(args.limit);

      const edges = (items as Array<EmailNotificationReturn>).map((r) => {
        return {
          cursor: encodeCursor(SORT_FIELDS[0].cursorId(r)),
          node: r,
        };
      });

      return {
        pageInfo: {
          hasNextPage: edges.length === args.limit,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await EmailNotification.countDocuments({ $and: filters }),
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
