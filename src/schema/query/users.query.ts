import { GraphQLList, GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { User } from '@models';
import { UserConnectionType, encodeCursor, decodeCursor } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { Types } from 'mongoose';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';

/** Default page size */
const DEFAULT_FIRST = 10;

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
  },
  async resolve(parent, args, context) {
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
          const filters: any[] = [abilityFilters];
          const afterCursor = args.afterCursor;
          const cursorFilters = afterCursor
            ? {
                _id: {
                  $gt: decodeCursor(afterCursor),
                },
              }
            : {};
          let items: any[] = await User.find({
            $and: [cursorFilters, ...filters],
          })
            .populate({
              path: 'roles',
              model: 'Role',
              match: { application: { $eq: null } },
            })
            .limit(first + 1);
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
