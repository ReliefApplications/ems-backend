import { GraphQLError, GraphQLInt, GraphQLID, GraphQLString } from 'graphql';
import {
  ApplicationConnectionType,
  encodeCursor,
  decodeCursor,
} from '../types';
import { Application } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '../../utils/filter/getFilter';
import getSortOrder from '../../utils/schema/resolvers/Query/getSortOrder';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Default filter fields */
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

const SORT_FIELDS = [
  {
    name: 'id',
    cursorId: (node: any) => node.id,
  },
  {
    name: 'name',
    cursorId: (node: any) => node.name,
  },
  {
    name: 'createdAt',
    cursorId: (node: any) => node.createdAt,
  },
  {
    name: 'modifiedAt',
    cursorId: (node: any) => node.modifiedAt || node.createdAt,
  },
];

/**
 * Lists all applications available for the logged user.
 * Throws GraphQL error if not logged.
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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
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
    const cursorFilters = afterCursor
      ? {
          _id: {
            $gt: decodeCursor(afterCursor),
          },
        }
      : {};

    let items: any[] = await Application.find({
      $and: [cursorFilters, ...filters],
    })
      .sort(
        args.sortField ? { [args.sortField]: getSortOrder(args.sortOrder) } : {}
      )
      .limit(first + 1);

    const hasNextPage = items.length > first;
    if (hasNextPage) {
      items = items.slice(0, items.length - 1);
    }
    // Method to get the sort identifier
    const cursorId =
      SORT_FIELDS.find((x) => x.name === args.sortField)?.cursorId ||
      SORT_FIELDS.find((x) => x.name === 'id').cursorId;
    const edges = items.map((r) => ({
      cursor: encodeCursor(cursorId(r)),
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
