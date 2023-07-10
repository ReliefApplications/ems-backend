import { GraphQLError, GraphQLID, GraphQLInt, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
import getFilteredArray from '@utils/schema/resolvers/Query/getFilteredArray';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { head, isEqual, last, maxBy, meanBy, minBy, size, sumBy } from 'lodash';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/**
 * procs an operator
 *
 * @param data data to add
 * @param operator operator to filter the data
 * @returns data operated
 */
const procOperator = (data: any, operator) => {
  console.log(size(data), data, 'data');
  switch (operator.expression) {
    case 'sum':
      return sumBy(data, operator.field);
    case 'average':
      return meanBy(data, operator.field);
    case 'count':
      return size(data);
    case 'maximum':
      return maxBy(data, operator.field);
    case 'minimum':
      return minBy(data, operator.field);
    case 'last':
      return head(data);
    case 'first':
      return last(data);
  }
};

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
      const groupBy = (array, keys) => {
        const result = new Map();

        for (const obj of array) {
          const keyValues = keys.map((key) => obj[key]);
          const uniqueKey = JSON.stringify(keyValues);

          if (!result.has(uniqueKey)) {
            const groupedObj = {};
            keys.forEach((key, index) => {
              groupedObj[key] = keyValues[index];
            });
            result.set(uniqueKey, groupedObj);
          }
        }

        return Array.from(result.values());
      };
      const keys = pipelineStep.form.groupBy.map((key) => key.field);
      data = groupBy(data, keys);
      console.log(data, 'should return something no??');
      break;
    case 'filter':
      data = getFilteredArray(data, pipelineStep.form.filter);
      break;
    case 'sort':
      if (pipelineStep.form.order === 'desc')
        data = data.sort((a, b) => (a.type < b.type ? 1 : -1));
      else if (pipelineStep.form.order === 'asc')
        data = data.sort((a, b) => (a.type < b.type ? -1 : 1));
      break;
    default:
      console.error('Aggregation error or not supported yet');
      break;
  }
  const operators = pipelineStep.form?.addFields;
  operators.forEach((operator) => (data = procOperator(data, operator)));
  console.log('vrere', data);
  return data;
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
      console.log(args.mapping, 'mapping');
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
          console.log(
            {
              items: dataToAggregate,
              totalCount: dataToAggregate.length,
            },
            'should look like that'
          );
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
