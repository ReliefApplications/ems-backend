import { GraphQLError, GraphQLInt, GraphQLString } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { FormConnectionType } from '../types';
import { Form } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import getFilter from '../../utils/filter/getFilter';
import { parseJSON } from '../../utils/schema';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'status',
    type: 'text',
  },
  {
    name: 'core',
    type: 'boolean',
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
const SORT_FIELDS: { name: string; type: string }[] = [
  {
    name: '_id',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'modifiedAt',
    type: 'date',
  },
];

/** Default sort field */
const DEFAULT_SORT_FIELD = SORT_FIELDS.find((x) => x.name === 'createdAt');

export default {
  /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: FormConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLJSON },
    filter: { type: GraphQLJSON },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability: AppAbility = context.user.ability;

    const abilityFilters = Form.accessibleBy(ability, 'read').getFilter();
    const queryFilters = getFilter(args.filter, FILTER_FIELDS);
    const filters: any[] = [queryFilters, abilityFilters];

    const sortField =
      SORT_FIELDS.find((x) => x.name === args.sortField) || DEFAULT_SORT_FIELD;
    const first = args.first || DEFAULT_FIRST;
    const cmpOperator = args.sortOrder === 'desc' ? '$lt' : '$gt';
    const cursorFilters = args.afterCursor
      ? {
          [sortField.name]: {
            [cmpOperator]: parseJSON(args.afterCursor, sortField.type),
          },
        }
      : {};

    let items: Form[] = await Form.find({
      $and: [cursorFilters, ...filters],
    })
      .sort({ [sortField.name]: args.sortOrder || 'asc' })
      .limit(first + 1);

    const hasNextPage = items.length > first;
    if (hasNextPage) {
      items = items.slice(0, items.length - 1);
    }
    const edges = items.map((r) => ({
      cursor: JSON.stringify(r[sortField.name]),
      node: r,
    }));
    return {
      pageInfo: {
        hasNextPage,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      edges,
      totalCount: await Form.countDocuments({ $and: filters }),
    };
  },
};
