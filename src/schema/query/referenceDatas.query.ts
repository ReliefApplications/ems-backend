import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import {
  ReferenceDataConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import { ReferenceData } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '@utils/filter/getFilter';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'name',
    type: 'text',
  },
];

/**
 * List all referenceDatas available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ReferenceDataConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const ability: AppAbility = context.user.ability;

      const abilityFilters = ReferenceData.find(
        accessibleBy(ability, 'read').ReferenceData
      ).getFilter();
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters, abilityFilters];

      const afterCursor = args.afterCursor;
      const cursorFilters = afterCursor
        ? {
            _id: {
              $gt: decodeCursor(afterCursor),
            },
          }
        : {};

      let items: any[] = await ReferenceData.find({
        $and: [cursorFilters, ...filters],
      }).limit(first + 1);

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
        totalCount: await ReferenceData.countDocuments({ $and: filters }),
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
