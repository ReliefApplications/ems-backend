import { GraphQLList, GraphQLError, GraphQLID, GraphQLInt } from 'graphql';
import { Role, User } from '@models';
import { UserConnectionType, decodeCursor, encodeCursor } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import mongoose, { Types } from 'mongoose';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { CompositeFilterDescriptor } from '@const/compositeFilter';
import GraphQLJSON from 'graphql-type-json';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import getFilter from '@utils/filter/getFilter';

/** Default page size */
const DEFAULT_FIRST = 10;

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  { name: 'ids', type: 'ObjectId' },
  { name: 'roles', type: 'users' },
  { name: 'name', type: 'text' },
  { name: 'username', type: 'text' },
];

/** Available sort fields */
const SORT_FIELDS = [
  {
    name: '_id',
    cursorId: (node: any) => node._id.toString(),
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        _id: {
          [operator]: new mongoose.Types.ObjectId(decodeCursor(cursor)),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        _id: getSortOrder(sortOrder),
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
  skip?: number;
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
    skip: { type: GraphQLInt },
  },
  async resolve(parent, args: UsersArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      // Make sure that the page size is not too important
      const first = args.first || DEFAULT_FIRST;
      checkPageSize(first);
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'User')) {
        const abilityFilters = User.find(
          accessibleBy(ability, 'read').User
        ).getFilter();
        // Get filters for the searched value
        const queryFilters = getFilter(args.filter, FILTER_FIELDS);
        const filters: any[] = [queryFilters, abilityFilters];
        const afterCursor = args.afterCursor;

        const sortField = SORT_FIELDS.find((x) => x.name === '_id');
        const sortOrder = 'asc';

        const cursorFilters = afterCursor
          ? sortField.cursorFilter(afterCursor, sortOrder)
          : {};

        // If querying the users for a list of applications, we also need to add
        // another filter to the array of filters, to only get users that have a role
        // in any of the applications provided
        if (args.applications) {
          // We get the roles for the queried applications
          const appRoles = await Role.find({
            application: {
              $in: args.applications.map((x) => new Types.ObjectId(x)),
            },
          }).select('_id');

          // We add the filter to get the users that have at least one role in the application(s)
          // besides meeting the other filter criteria
          filters.push({ roles: { $in: appRoles } });
        }

        let items: any[] = await User.find({
          $and: [cursorFilters, ...filters],
        })
          .populate({
            path: 'roles',
            model: 'Role',
            match: {
              application: args.applications
                ? { $in: args.applications.map((x) => new Types.ObjectId(x)) } // Filters out roles that are not part of the application(s) provided
                : { $eq: null }, // Filters out all front-office roles
            },
          })
          .sort(sortField.sort(sortOrder))
          .skip(args.skip || 0)
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
          totalCount: await User.countDocuments({ $and: filters }),
        };
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
