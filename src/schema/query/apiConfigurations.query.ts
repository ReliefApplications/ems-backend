import { GraphQLError, GraphQLInt, GraphQLID, GraphQLString } from 'graphql';
import {
  ApiConfigurationConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { ApiConfiguration } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { CompositeFilterDescriptor } from '@const/compositeFilter';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Arguments for the apiConfigurations query */
type ApiConfigurationsArgs = {
  first?: number;
  afterCursor?: string;
  filter?: CompositeFilterDescriptor;
  sortField?: string;
  sortOrder?: string;
};

/** Available filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'status',
    type: 'text',
  },
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
];

/**
 * List all apiConfiguration available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ApiConfigurationConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args: ApiConfigurationsArgs, context: Context) {
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
      const abilityFilters = ApiConfiguration.find(
        accessibleBy(ability, 'read').ApiConfiguration
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

      let items: any[] = await ApiConfiguration.find({
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
        totalCount: await ApiConfiguration.countDocuments({ $and: filters }),
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
