import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import { ResourceConnectionType, encodeCursor, decodeCursor } from '../types';
import { Resource } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '../../utils/filter/getFilter';
import getPipelineSortStages from '../../utils/sort/getPipelineSortStages';

const DEFAULT_FIRST = 10;

const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'name',
    type: 'text',
  },
];

export default {
  /* List all resources available for the logged user.
  Throw GraphQL error if not logged.
  */
  type: ResourceConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    sort: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability: AppAbility = context.user.ability;

    const abilityFilters = Resource.accessibleBy(ability, 'read').getFilter();
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

    const stages = getPipelineSortStages(args.sort, 'RESOURCES');
    const itemsAggr: any[] = await Resource.aggregate([
      { $match: { $and: [cursorFilters, ...filters] } },
      ...stages,
      { $limit: first + 1 },
    ]).exec();

    let items = itemsAggr.map((it) => new Resource(it));

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
      totalCount: await Resource.countDocuments({ $and: filters }),
    };
  },
};
