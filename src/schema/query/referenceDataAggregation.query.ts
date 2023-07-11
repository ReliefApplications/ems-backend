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
  max,
  mean,
  min,
  size,
  sum,
  groupBy,
  pick,
  orderBy,
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
      return {
        sum: sum(data.map((element) => Number(element[operator.field]))),
      };
    case 'avg':
      return {
        avg: mean(data.map((element) => Number(element[operator.field]))),
      };
    case 'count':
      return { count: size(data) };
    case 'max':
      return {
        max: max(data.map((element) => Number(element[operator.field]))),
      };
    case 'min':
      return {
        min: min(data.map((element) => Number(element[operator.field]))),
      };
    case 'last':
      return {
        last: last(orderBy(data, operator.field))[operator.field],
      };
    case 'first':
      return {
        first: head(orderBy(data, operator.field))[operator.field],
      };
    default:
      return data;
  }
};

/**
 * returns the result for a pipeline step
 *
 * @param pipelineStep step of the pipeline to build a result from
 * @param data the reference data
 * @param sourceFields fields we want to get in our final data
 * @returns filtered data
 */
const procPipelineStep = (pipelineStep, data, sourceFields) => {
  switch (pipelineStep.type) {
    case 'group':
      const operators = pipelineStep.form?.addFields?.map(
        (operator) => operator.expression
      );
      const keysToGroupBy = pipelineStep.form.groupBy.map((key) => key.field);
      data = groupBy(data, (dataKey) =>
        keysToGroupBy.map((key) => dataKey[key])
      );
      for (const key in data) {
        let supplementaryFields: any;
        for (const operator of operators) {
          supplementaryFields = {
            ...supplementaryFields,
            ...procOperator(data[key], operator),
          };
        }
        data[key] = { initialData: data[key], ...supplementaryFields };
      }
      const dataToKeep = [];
      for (const key in data) {
        //projecting on interesting fields
        dataToKeep.push({
          ...pick(data[key].initialData[0], sourceFields),
          ...pick(
            data[key],
            operators.map((operator) => operator.operator)
          ),
        });
      }
      return dataToKeep;
    case 'filter':
      return getFilteredArray(data, pipelineStep.form);
    case 'sort':
      return orderBy(data, pipelineStep.form.field, pipelineStep.form.order);
    default:
      console.error('Aggregation not supported yet');
      return;
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
          for (const dataElement of dataToAggregate) {
            //we remove white spaces as they end up being a mess, but probably a temp fix as I think we should remove white spaces straight when saving ref data in mongo
            for (const key in dataElement) {
              if (/\s/g.test(key)) {
                dataElement[key.replace(/ /g, '')] = dataElement[key];
                delete dataElement[key];
              }
            }
          }
          aggregation.pipeline.forEach((step: any) => {
            dataToAggregate = procPipelineStep(
              step,
              dataToAggregate,
              aggregation.sourceFields
            );
          });
          if (args.mapping) {
            return dataToAggregate.map((item) => {
              return {
                category: item[args.mapping.category],
                field: item[args.mapping.field],
              };
            });
          }
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
