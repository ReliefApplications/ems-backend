import { GraphQLError, GraphQLList, GraphQLString } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import getFilter from '@utils/filter/getFilter';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { accessibleBy } from '@casl/mongoose';
import { CompositeFilterDescriptor } from '@const/compositeFilter';
import { GraphQLJSON } from 'graphql-type-json';

/** Default filter fields */
const FILTER_FIELDS: { name: string; type: string }[] = [
  {
    name: 'name',
    type: 'text',
  },
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

/** Arguments for the forms query */
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
  },
  async resolve(parent, args: LayerArgs, context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Inputs check
      if (args.sortField) {
        if (!SORT_FIELDS.map((x) => x.name).includes(args.sortField)) {
          throw new GraphQLError(`Cannot sort by ${args.sortField} field`);
        }
      }

      // create ability object for all layers
      const ability: AppAbility = user.ability;

      const abilityFilters = Layer.find(
        accessibleBy(ability, 'read').Layer
      ).getFilter();
      const queryFilters = getFilter(args.filter, FILTER_FIELDS);
      const filters: any[] = [queryFilters, abilityFilters];

      const sortField = SORT_FIELDS.find((x) => x.name === args.sortField);
      const sortOrder = args.sortOrder || 'asc';

      return await Layer.find({
        $and: [...filters],
      }).sort(sortField.sort(sortOrder));
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
