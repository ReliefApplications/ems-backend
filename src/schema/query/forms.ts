import { GraphQLError, GraphQLInt, GraphQLID, GraphQLBoolean } from 'graphql';
import { FormConnectionType, encodeCursor, decodeCursor } from '../types';
import { Form, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { GraphQLJSON } from 'graphql-type-json';
import getFilter from '../../utils/filter/getFilter';

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

export default {
  /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: FormConnectionType,
  args: {
    getAll: { type: GraphQLBoolean },
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;

    const resourceFilters = Resource.accessibleBy(ability, 'read').getFilter();

    const resources = await Resource.find(resourceFilters);
    const resourceIds = resources.map((r) => r._id);

    const abilityFilters = Form.accessibleBy(ability, 'read').getFilter();

    // also get's the forms linked to resources that the user has read permission
    // but doesn't have permission for the form itself
    if (
      abilityFilters.$and[0].$or &&
      abilityFilters.$and[0].$or[0]['permissions.canSee']
    )
      abilityFilters.$and[0].$or.push({
        resource: {
          $in: resourceIds,
        },
      });
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

    let items: any[] = await Form.find({
      $and: [cursorFilters, ...filters],
    }).limit(args.getAll ? undefined : 1);

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
      totalCount: await Form.countDocuments({ $and: filters }),
    };
  },
};
