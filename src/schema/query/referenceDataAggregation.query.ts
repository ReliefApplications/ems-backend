import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
import getFilteredArray from '@utils/schema/resolvers/Query/getFilteredArray';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/**
 * Take an aggregation configuration as parameter.
 * Return aggregated records data.
 */
export default {
  type: GraphQLJSON,
  args: {
    referenceData: { type: new GraphQLNonNull(GraphQLID) },
    aggregation: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(parent, args, context) {
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const referenceData = await ReferenceData.findById(args.referenceData);

      const aggregation = args.aggregation;

      // Check if resource exists and aggregation exists
      if (!(referenceData && aggregation && referenceData.data)) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Build the source fields step
      if (
        aggregation.sourceFields &&
        aggregation.sourceFields.length &&
        aggregation.pipeline &&
        aggregation.pipeline.type
      ) {
        switch (aggregation.pipeline.type) {
          case 'group':
            return referenceData.data.reduce(function (r, a) {
              const key = a[aggregation.pipeline.groupBy];
              r[key] = r[key] || [];
              r[key].push(a);
              return r;
            }, Object.create(null));
          case 'filter':
            return getFilteredArray(
              referenceData.data,
              aggregation.pipeline.filter
            );
          case 'sort':
            if (aggregation.pipeline.order === 'desc')
              return referenceData.data.sort((a, b) =>
                a.type < b.type ? -1 : 1
              );
            else if (aggregation.pipeline.order === 'asc')
              return referenceData.data.sort((a, b) =>
                a.type < b.type ? 1 : -1
              );
        }
      } else {
        throw new GraphQLError(
          context.i18next.t(
            'query.records.aggregation.errors.invalidAggregation'
          )
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
