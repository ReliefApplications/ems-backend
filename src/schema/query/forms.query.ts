import { GraphQLError, GraphQLInt, GraphQLID, GraphQLString } from 'graphql';
import { FormConnectionType, encodeCursor, decodeCursor } from '../types';
import { Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GraphQLJSON } from 'graphql-type-json';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { CompositeFilterDescriptor } from '../../types/filter';
import { Context } from '@server/apollo/context';

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
const SORT_FIELDS = [
  {
    name: 'name',
    cursorId: (node: any) => node.name,
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        name: {
          [operator]: decodeCursor(cursor),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        name: getSortOrder(sortOrder),
      };
    },
  },
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
  {
    name: 'modifiedAt',
    cursorId: (node: any) =>
      (node.modifiedAt || node.createdAt).getTime().toString(),
    cursorFilter: (cursor: any, sortOrder: string) => {
      const operator = sortOrder === 'asc' ? '$gt' : '$lt';
      return {
        modifiedAt: {
          [operator]: decodeCursor(cursor),
        },
      };
    },
    sort: (sortOrder: string) => {
      return {
        modifiedAt: getSortOrder(sortOrder),
      };
    },
  },
];

/** Arguments for the forms query */
type FormsArgs = {
  first?: number;
  afterCursor?: string | Types.ObjectId;
  filter?: CompositeFilterDescriptor;
  sortField?: string;
  sortOrder?: string;
};

/**
 * List all forms available for the logged user.
 * Throw GraphQL error if not logged.
 * Use cursor-based pagination.
 */
export default {
  type: FormConnectionType,
  args: {
    first: { type: GraphQLInt },
    afterCursor: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
  },
  async resolve(parent, args: FormsArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const user = context.user;
      // Inputs check
      if (args.sortField) {
        if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
          throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
        }
      }

      const ability: AppAbility = user.ability;

      const abilityFilters = Form.find(
        accessibleBy(ability, 'read').Form
      ).getFilter();
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters, abilityFilters];

      const afterCursor = args.afterCursor;

      const sortField =
        SORT_FIELDS.find((x) => x.name === args.sortField) ||
        SORT_FIELDS.find((x) => x.name === 'createdAt');
      const sortOrder = args.sortOrder || 'asc';

      const cursorFilters = afterCursor
        ? sortField.cursorFilter(afterCursor, sortOrder)
        : {};

      let items: any[] = await Form.find({
        $and: [cursorFilters, ...filters],
      })
        // Make it case insensitive
        .collation({ locale: 'en' })
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
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount: await Form.countDocuments({ $and: filters }),
      };
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
