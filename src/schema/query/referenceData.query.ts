import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ReferenceDataType } from '../types';
import { ReferenceData } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { CompositeFilterDescriptor } from '@const/compositeFilter';

/** Arguments for the referenceData query */
type ReferenceDataArgs = {
  id: string | Types.ObjectId;
  contextFilters?: CompositeFilterDescriptor;
};

/**
 * Apply filter to item.
 *
 * @param item item to filter.
 * @param filter filter to apply.
 * @returns true if item matches filter, false otherwise.
 */
function applyFilter(item, filter) {
  if (filter.logic && filter.filters) {
    const results = filter.filters.map((subFilter) =>
      applyFilter(item, subFilter)
    );
    return filter.logic === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  } else {
    switch (filter.operator) {
      case 'eq':
        return item[filter.field] === filter.value;
      case 'ne':
      case 'neq':
        return item[filter.field] !== filter.value;
      case 'gt':
        return item[filter.field] > filter.value;
      case 'gte':
        return item[filter.field] >= filter.value;
      case 'lt':
        return item[filter.field] < filter.value;
      case 'lte':
        return item[filter.field] <= filter.value;
      case 'isnull':
        return item[filter.field] === null;
      case 'isnotnull':
        return item[filter.field] !== null;
      case 'startswith':
        return item[filter.field].startsWith(filter.value);
      case 'endswith':
        return item[filter.field].endsWith(filter.value);
      case 'contains':
        return item[filter.field].includes(filter.value);
      case 'doesnotcontain':
        return !item[filter.field].includes(filter.value);
      default:
        return true;
    }
  }
}

/**
 * Return Reference Data from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    contextFilters: { type: GraphQLJSON },
  },
  async resolve(parent, args: ReferenceDataArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const referenceData = await ReferenceData.findById(args.id);

      if (args.contextFilters && args.contextFilters.filters.length > 0) {
        referenceData.data = referenceData.data.filter((item) =>
          applyFilter(item, args.contextFilters)
        );
      }

      return referenceData ? referenceData : [];
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
