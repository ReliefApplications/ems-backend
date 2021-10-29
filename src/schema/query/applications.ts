import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import { ApplicationConnectionType, encodeCursor, decodeCursor } from '../types';
import { Application } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';

const DEFAULT_FIRST = 10;

const buildMongoFilter = (filters: any): any => {
  const mongoFilter = {};
  for (const f of filters) {
    if (f.value) {
      switch (f.operator) {
        case 'contains':
          mongoFilter[f.field] = { $regex: f.value, $options: 'i' };
          break;
        case 'eq':
          mongoFilter[f.field] = { $eq: f.value };
          break;
        case 'between':
          mongoFilter[f.field] = {
            $gte: f.value.startDate,
            $lt: f.value.endDate,
          };
          break;
        default:
          break;
      }
    }
  }
  return mongoFilter;
};

export default {
  /*  List all applications available for the logged user.
      Throw GraphQL error if not logged.
  */
  type: ApplicationConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filters: { type: GraphQLJSON },
    // DEPREC disabled
    // sort: { type: GraphQLJSON }
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = context.user.ability;

    const abilityFilters = Application.accessibleBy(ability, 'read').getFilter();

    const first = args.first || DEFAULT_FIRST;
    const afterCursor = args.afterCursor;
    const cursorFilters = afterCursor ? {
      _id: {
        $gt: decodeCursor(afterCursor),
      },
    } : {};

    const filtersQuery = {};
    const newFilters = buildMongoFilter(args.filters.filters);
    filtersQuery['$' + args.filters.logic] = newFilters;

    const filterAndTemp = filtersQuery['$and'];
    const countDocumentFilter = {};
    if (filterAndTemp) {
      filtersQuery['$and'] = [filterAndTemp, cursorFilters, abilityFilters];
      countDocumentFilter['$and'] = [filterAndTemp, abilityFilters];
    } else {
      filtersQuery['$and'] = [cursorFilters, abilityFilters];
      countDocumentFilter['$and'] = [abilityFilters];
    }

    let items: any[] = await Application.find(filtersQuery)
      // DEPREC disabled
      // .sort(args.sort)
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
      totalCount: await Application.countDocuments(filtersQuery),
    };
  },
};
