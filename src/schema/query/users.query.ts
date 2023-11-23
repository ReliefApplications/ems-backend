import { GraphQLList, GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { User } from '@models';
import { UserConnectionType, encodeCursor, decodeCursor } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { accessibleBy } from '@casl/mongoose';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import getFilter from '@utils/filter/getFilter';
import { CompositeFilterDescriptor } from '@const/compositeFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'roles',
    type: 'ObjectId',
  },
  {
    name: 'name',
    type: 'text',
  },
];

/** Available sort fields */
const SORT_FIELDS = [
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

/** Arguments for the users query */
type UsersArgs = {
  applications?: string[] | Types.ObjectId[];
  first?: number;
  filter?: CompositeFilterDescriptor;
  afterCursor?: string;
};

/**
 * List back-office users if logged user has admin permission.
 * Throw GraphQL error if not logged or not authorized.
 */
export default {
  type: UserConnectionType,
  args: {
    applications: { type: new GraphQLList(GraphQLID) },
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args: UsersArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      // Make sure that the page size is not too important
      const first = args.first || DEFAULT_FIRST;
      checkPageSize(first);
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'User')) {
        if (!args.applications) {
          const abilityFilters = User.find(
            accessibleBy(ability, 'read').User
          ).getFilter();
          const queryFilters = getFilter(args.filter, FILTER_FIELDS);
          const filters: any[] = [queryFilters, abilityFilters];
          const afterCursor = args.afterCursor;

          const sortField = SORT_FIELDS.find((x) => x.name === 'createdAt');
          const sortOrder = 'asc';

          const cursorFilters = afterCursor
            ? sortField.cursorFilter(afterCursor, sortOrder)
            : {};

          let items: any[] = await User.find({
            $and: [cursorFilters, ...filters],
          })
            .populate({
              path: 'roles',
              model: 'Role',
              match: { application: { $eq: null } },
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
              endCursor:
                edges.length > 0 ? edges[edges.length - 1].cursor : null,
            },
            edges,
            totalCount: await User.countDocuments({ $and: filters }),
          };
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
                        args.applications.map((x) => new Types.ObjectId(x)),
                      ],
                    },
                  },
                },
              },
            },
            // Filter users that have at least one role in the application(s).
            { $match: { 'roles.0': { $exists: true } } },
          ];
          const userAggregate = await User.aggregate(aggregations);
          return userAggregate;
        }
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
