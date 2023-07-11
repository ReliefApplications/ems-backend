import { GraphQLError, GraphQLID, GraphQLInt, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
import getFilteredArray from '@utils/schema/resolvers/Query/getFilteredArray';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import {
  head,
  isEqual,
  last,
  maxBy,
  meanBy,
  minBy,
  size,
  sumBy,
  groupBy,
  pick,
} from 'lodash';

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
  switch (operator.operator) {
    case 'sum':
      return { data: data, sum: sumBy(data, operator.field) };
    case 'average':
      return { data: data, average: meanBy(data, operator.field) };
    case 'count':
      return { data: data, count: size(data) };
    case 'maximum':
      return { data: data, maximum: maxBy(data, operator.field) };
    case 'minimum':
      return { data: data, minimum: minBy(data, operator.field) };
    case 'last':
      return { data: data, last: last(data) };
    case 'first':
      return { data: data, first: head(data) };
    default:
      return data;
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
  const operators = pipelineStep.form?.addFields?.map(
    (operator) => operator.expression
  );
  switch (pipelineStep.type) {
    case 'group':
      const keysToGroupBy = pipelineStep.form.groupBy.map((key) => key.field);
      data = groupBy(data, (dataKey) =>
        keysToGroupBy.map((key) => dataKey[key])
      );
      for (const key in data) {
        for (const operator of operators) {
          data[key] = procOperator(data[key], operator);
        }
      }
      console.log(data, 'data after swagging it with operators');
      const dataToKeep = [];
      for (const key in data) {
        dataToKeep.push({
          ...pick(data[key].data[0], keysToGroupBy),
          ...pick(
            data[key],
            operators.map((operator) => operator.operator)
          ),
        });
      }
      console.log(dataToKeep, 'data to keep');
      return dataToKeep;
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
