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
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @returns Mongo filter.
 */
async function buildQuery(filter, doc) {
  // Em seguida, crie um conjunto dos nomes dos campos para facilitar a verificação
  const fieldNames = new Set(doc.fields.map((field) => field.name));

  if (filter.logic && filter.filters) {
    const mongoFilters = await Promise.all(
      filter.filters.map((subFilter) => {
        console.log(subFilter); // remove this line
        if (subFilter.logic && subFilter.filters) {
          return buildQuery(subFilter, doc);
        } else {
          if (fieldNames.has(subFilter.field)) {
            const obj = {};
            if (subFilter.operator) {
              obj[`data.${subFilter.field}`] = {
                ['$' + subFilter.operator]: subFilter.value,
              };
            } else {
              obj[`data.${subFilter.field}`] = subFilter.value;
            }
            return obj;
          } else {
            return;
          }
        }
      })
    );
    return { ['$' + filter.logic]: mongoFilters };
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
      const query: any = { _id: args.id }; // Pesquisa por ID sempre

      if (args.contextFilters) {
        const doc = await ReferenceData.findById(args.id);
        const filterQuery = await buildQuery(args.contextFilters, doc);
        query.$and = [query, filterQuery];
      }

      //console.log(query, args.contextFilters);
      return await ReferenceData.find(query);
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
