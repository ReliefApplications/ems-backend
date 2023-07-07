import { GraphQLError, GraphQLID, GraphQLInt, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
import getFilteredArray from '@utils/schema/resolvers/Query/getFilteredArray';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { isEqual } from 'lodash';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/**
 * returns the result for a pipeline step
 *
 * @param pipelineStep step of the pipeline to build a result from
 * @param data the reference data
 * @returns filtered data
 */
const procPipelineStep = (pipelineStep, data) => {
  switch (pipelineStep.type) {
    case 'group':
      return data.reduce(function (r, a) {
        const key = a[pipelineStep.form.groupBy];
        r[key] = r[key] || [];
        r[key].push(a);
        return r;
      }, Object.create(null));
    case 'filter':
      return getFilteredArray(data, pipelineStep.filter);
    case 'sort':
      if (pipelineStep.form.order === 'desc')
        return data.sort((a, b) => (a.type < b.type ? -1 : 1));
      else if (pipelineStep.order === 'asc')
        return data.sort((a, b) => (a.type < b.type ? 1 : -1));
    default:
      console.error('Aggregation error or not supported yet');
  }
};

/**
 * Take an aggregation configuration as parameter.
 * Return aggregated records data.
 */
export default {
  type: GraphQLJSON,
  args: {
    referenceData: { type: new GraphQLNonNull(GraphQLID) },
    aggregation: { type: new GraphQLNonNull(GraphQLID) },
    mapping: { type: GraphQLJSON },
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
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

      // As we only queried one aggregation
      const aggregation = referenceData.aggregations.find((x) =>
        isEqual(x.id, args.aggregation)
      );

      // Check if resource exists and aggregation exists
      if (!(referenceData && aggregation && referenceData.data)) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Build the source fields step
      if (
        aggregation.sourceFields &&
        aggregation.sourceFields.length &&
        aggregation.pipeline
      ) {
        try {
          let dataToAggregate = referenceData.data;
          aggregation.pipeline.forEach((step: any) => {
            dataToAggregate = procPipelineStep(step, dataToAggregate);
          });
          return { items: dataToAggregate, totalCount: dataToAggregate.length };
        } catch (error) {
          throw new GraphQLError(
            'Something went wrong with the pipelines, these aggregations may not be supported yet'
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
