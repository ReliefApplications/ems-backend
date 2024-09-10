import { GraphQLError, GraphQLInt, GraphQLID, GraphQLString } from 'graphql';
import {
  ReferenceDataConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import { ReferenceData } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { CompositeFilterDescriptor } from '@const/compositeFilter';
import { Context } from '@server/apollo/context';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'name',
    type: 'text',
  },
];

/** Default sort by */
const DEFAULT_SORT_FIELD = 'name';

/** Available sort fields */
const SORT_FIELDS = [
  {
    name: 'name',
    cursorId: (node: any) => node.name,
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        name: {
          [operator]: decodeCursor(cursor),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        name: getSortOrder(sortOrder),
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
/** Arguments for the referenceDatas query */
type ReferenceDatasArgs = {
  first?: number;
  afterCursor?: string;
  filter?: CompositeFilterDescriptor;
  sortField?: string;
  sortOrder?: string;
};

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
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args: ReferenceDatasArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      // Inputs check
      if (args.sortField) {
        if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
          throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
        }
      }

      const ability: AppAbility = context.user.ability;

      const abilityFilters = ReferenceData.find(
        accessibleBy(ability, 'read').ReferenceData
      ).getFilter();
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters, abilityFilters];

      const afterCursor = args.afterCursor;
      const sortField =
        SORT_FIELDS.find((x) => x.name === args.sortField) ||
        SORT_FIELDS.find((x) => x.name === DEFAULT_SORT_FIELD);

      const sortOrder = args.sortOrder || 'asc';

      const cursorFilters = afterCursor
        ? sortField.cursorFilter(afterCursor, sortOrder)
        : {};

      let items: any[] = await ReferenceData.find({
        $and: [cursorFilters, ...filters],
      })
        // Make it case insensitive
        .collation({ locale: 'en' })
        .sort(sortField.sort(sortOrder))
        .limit(first + 1);

      const hasNextPage = items.length > first;
      if (hasNextPage) {
        items = items.slice(0, items.length - 1);
      }

      const edges = items.map((r) => ({
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
