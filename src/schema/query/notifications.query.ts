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

/** Default page size */
const DEFAULT_FIRST = 10;

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
  async resolve(parent, args, context) {
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;

      const abilityFilters = Notification.accessibleBy(
        ability,
        'read'
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
        $and: [cursorFilters, ...filters],
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
        totalCount: await Notification.countDocuments({ $and: filters }),
      };
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
