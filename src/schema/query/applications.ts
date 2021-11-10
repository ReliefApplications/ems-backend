import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import { ApplicationConnectionType, encodeCursor, decodeCursor } from '../types';
import { Application } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import getFilter from '../../utils/filter/getFilter';

const DEFAULT_FIRST = 10;

const FILTER_FIELDS: { name: string, type: string }[] = [
  {
    name: 'status',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'Date',
  },
  {
    name: 'name',
    type: 'text',
  },
];

export default {
  /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: ApplicationConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = context.user.ability;

    const abilityFilters = Application.accessibleBy(ability, 'read').getFilter();
    const queryFilters = getFilter(args.filter, FILTER_FIELDS);
    const filters: any[] = [queryFilters, abilityFilters]; 

    const first = args.first || DEFAULT_FIRST;
    const afterCursor = args.afterCursor;
    const cursorFilters = afterCursor ? {
      _id: {
        $gt: decodeCursor(afterCursor),
      },
    } : {};

    let items: any[] = await Application.find({ $and: [cursorFilters, ...filters] })
      .limit(first + 1);

    const hasNextPage = items.length > first;
    if (hasNextPage) {
      items = items.slice(0, items.length - 1);
    }
    const edges = items.map(r => ({
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
      totalCount: await Application.countDocuments({ $and: filters }),
    };
  },
};
