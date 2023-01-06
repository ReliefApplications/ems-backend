import { GraphQLError, GraphQLInt, GraphQLID, GraphQLString } from 'graphql';
import {
  ApplicationConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import { Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Available filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'status',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'name',
    type: 'text',
  },
];

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
  {
    name: 'modifiedAt',
    cursorId: (node: any) =>
      (node.modifiedAt || node.createdAt).getTime().toString(),
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        modifiedAt: {
          [operator]: decodeCursor(cursor),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        modifiedAt: getSortOrder(sortOrder),
      };
    },
  },
];

/**
 * List all applications available for the logged user.
 * Throw GraphQL error if not logged.
 * Use cursor-based pagination.
 */
export default {
  type: ApplicationConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // Inputs check
    if (args.sortField) {
      if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
        throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
      }
    }

    const ability: AppAbility = context.user.ability;

    // Inputs check
    if (args.sortField) {
      if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
        throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
      }
    }

    const abilityFilters = Application.accessibleBy(
      ability,
      'read'
    ).getFilter();
    const queryFilters = getFilter(args.filter, FILTER_FIELDS);
    const filters: any[] = [queryFilters, abilityFilters];

    const first = args.first || DEFAULT_FIRST;
    const afterCursor = args.afterCursor;

    const sortField =
      SORT_FIELDS.find((x) => x.name === args.sortField) ||
      SORT_FIELDS.find((x) => x.name === 'createdAt');
    const sortOrder = args.sortOrder || 'asc';

    const cursorFilters = afterCursor
      ? sortField.cursorFilter(afterCursor, sortOrder)
      : {};

    let items: any[] = await Application.find({
      $and: [cursorFilters, ...filters],
    })
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
      totalCount: await Application.countDocuments({ $and: filters }),
    };
  },
};
