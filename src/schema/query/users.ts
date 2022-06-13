import { GraphQLList, GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { User } from '../../models';
import { UserConnectionType, encodeCursor, decodeCursor } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';
import getFilter from '../../utils/filter/getFilter';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'name',
    type: 'text',
  },
  {
    name: 'username',
    type: 'text',
  },
];

/**
 *  List back-office users if logged user has admin permission.
 *  Throw GraphQL error if not logged or not authorized.
 */
export default {
  type: UserConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    applications: { type: GraphQLList(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;

    const abilityFilters = User.accessibleBy(ability, 'read').getFilter();
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

    let items: any[];

    if (ability.can('read', 'User')) {
      if (!args.applications) {
        items = await User.find({
          $and: [cursorFilters, ...filters],
        })
          .limit(first + 1)
          .populate({
            path: 'roles',
            match: { application: { $eq: null } },
          });
      } else {
        const aggregations = [
          // Left join
          {
            $lookup: {
              from: 'roles',
              localField: 'roles',
              foreignField: '_id',
              as: 'roles',
            },
          },
          // Replace the roles field with a filtered array, containing only roles that are part of the application(s).
          {
            $addFields: {
              roles: {
                $filter: {
                  input: '$roles',
                  as: 'role',
                  cond: {
                    $in: [
                      '$$role.application',
                      args.applications.map((x) => mongoose.Types.ObjectId(x)),
                    ],
                  },
                },
              },
            },
          },
          // Filter users that have at least one role in the application(s).
          { $match: { 'roles.0': { $exists: true }, ...cursorFilters } },
          { $limit: first + 1 },
        ];
        items = (await User.aggregate(aggregations)).map((x) => new User(x));
      }

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
        totalCount: await User.countDocuments({ $and: filters }),
      };
    } else {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
  },
};
