import { GraphQLError, GraphQLList, GraphQLString, GraphQLID } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { CompositeFilterDescriptor } from '@const/compositeFilter';
import { GraphQLJSON } from 'graphql-type-json';
import { Context } from '@server/apollo/context';

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'name',
    type: 'text',
  },
  { name: 'ids', type: 'ObjectId' },
];

/** Available sort fields */
const SORT_FIELDS = [
  {
    name: 'name',
    sort: (sortOrder: string) => {
      return {
        name: getSortOrder(sortOrder),
      };
    },
  },
];

/** Arguments for the layers query */
type LayerArgs = {
  filter?: CompositeFilterDescriptor;
  sortField?: string;
  sortOrder?: string;
};

/**
 * List all layers.
 * Throw GraphQL error if not logged and if not permission to access.
 */
export default {
  type: new GraphQLList(LayerType),
  args: {
    filter: { type: GraphQLJSON },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
    ids: { type: new GraphQLList(GraphQLID) },
  },
  async resolve(parent, args: LayerArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Inputs check
      if (args.sortField) {
        if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
          throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
        }
      }

      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters];

      const sortField = SORT_FIELDS.find((x) => x.name === args.sortField);
      const sortOrder = args.sortOrder || 'asc';

      return await Layer.find({
        $and: [...filters],
      })
        .collation({ locale: 'en' })
        .sort(sortField.sort(sortOrder));
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
