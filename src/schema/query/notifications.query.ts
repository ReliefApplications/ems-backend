import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import {
  NotificationConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import { Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Arguments for the notifications query */
type NotificationsArgs = {
  first?: number;
  afterCursor?: string;
};

/**
 * List all forms available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: NotificationConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
  },
  async resolve(parent, args: NotificationsArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const ability: AppAbility = context.user.ability;

      const abilityFilters = Notification.find(
        accessibleBy(ability, 'read').Notification
      ).getFilter();
      const filters: any[] = [abilityFilters];

      const afterCursor = args.afterCursor;
      const cursorFilters = afterCursor
        ? {
            _id: {
              $lt: decodeCursor(afterCursor),
            },
          }
        : {};

      let items: any[] = await Notification.find({
        $or: [{ $and: [cursorFilters, ...filters] }, { user: context.user }],
      })
        .sort({ createdAt: -1 })
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
        totalCount: await Notification.countDocuments({
          $or: [{ $and: filters }, { user: context.user }],
        }),
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
