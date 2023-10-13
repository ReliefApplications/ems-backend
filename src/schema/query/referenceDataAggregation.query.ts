import {
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DataTransformer, ReferenceData } from '@models';
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
import { graphQLAuthCheck } from '@schema/shared';
import { CustomAPI } from '@server/apollo/dataSources';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;
/** Pipeline types */
enum pipelineType {
  group = 'group',
  filter = 'filter',
  sort = 'sort',
}
/** Operator Type */
enum operatorType {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MAX = 'max',
  MIN = 'min',
  LAST = 'last',
  FIRST = 'first',
}
/**
 * procs an operator
 *
 * @param data data to add
 * @param operator operator to filter the data
 * @returns data operated
 */
const procOperator = (data: any, operator) => {
  switch (operator.operator) {
    case operatorType.SUM:
      return {
        sum: sum(data.map((element) => Number(element[operator.field]))),
      };
    case operatorType.AVG:
      return {
        avg: mean(data.map((element) => Number(element[operator.field]))),
      };
    case operatorType.COUNT:
      return { count: size(data) };
    case operatorType.MAX:
      return {
        max: max(data.map((element) => Number(element[operator.field]))),
      };
    case operatorType.MIN:
      return {
        min: min(data.map((element) => Number(element[operator.field]))),
      };
    case operatorType.LAST:
      return {
        last: last(orderBy(data, operator.field))[operator.field],
      };
    case operatorType.FIRST:
      return {
        first: head(orderBy(data, operator.field))[operator.field],
      };
    default:
      return data;
  }
};
// eslint-disable-next-line jsdoc/require-returns-check
/**
 * Add a pipeline step to the aggregation
 *
 * @param args arguments to add to the pipeline step
 * @returns aggregation with the pipeline step added
 */
const addPipelines = (args: any) => {
  const newPipelines = [];
  if (args.contextFilters) {
    newPipelines.unshift({
      type: pipelineType.filter,
      form: args.contextFilters,
    });
  }
  if (args.sortField && args.sortOrder) {
    newPipelines.push({
      type: pipelineType.sort,
      form: {
        field: args.sortField,
        order: args.sortOrder,
      },
    });
  }
  return newPipelines;
};

/**
 * returns the result for a pipeline step
 *
 * @param pipelineStep step of the pipeline to build a result from
 * @param data the reference data the pipeline step
 * @param sourceFields fields we want to get in our final data
 * @returns filtered data
 */
const procPipelineStep = (pipelineStep, data, sourceFields) => {
  switch (pipelineStep.type) {
    case pipelineType.group:
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
    case pipelineType.filter:
      return getFilteredArray(data, pipelineStep.form);
    case pipelineType.sort:
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
    sortOrder: { type: GraphQLString },
    sortField: { type: GraphQLString },
    contextFilters: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const referenceData = await ReferenceData.findById(
        args.referenceData
      ).populate({
        path: 'apiConfiguration',
        model: 'ApiConfiguration',
      });

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
          let rawItems = [];
          if (referenceData.type === 'static') {
            rawItems = referenceData.data || [];
          } else {
            const dataSource = context.dataSources[
              (referenceData.apiConfiguration as any).name
            ] as CustomAPI;
            rawItems =
              (await dataSource.getReferenceDataItems(
                referenceData,
                referenceData.apiConfiguration as any
              )) || [];
          }
          const transformer = new DataTransformer(
            referenceData.fields,
            rawItems
          );
          let items = transformer.transformData();
          for (const item of items) {
            //we remove white spaces as they end up being a mess, but probably a temp fix as I think we should remove white spaces straight when saving ref data in mongo
            for (const key in item) {
              if (/\s/g.test(key)) {
                item[key.replace(/ /g, '')] = item[key];
                delete item[key];
              }
            }
          }
          aggregation.pipeline = addPipelines(args);
          aggregation.pipeline.forEach((step: any) => {
            items = procPipelineStep(step, items, aggregation.sourceFields);
          });
          if (args.mapping) {
            return items.map((item) => {
              return {
                category: item[args.mapping.category],
                field: item[args.mapping.field],
              };
            });
          }
          return { items: items, totalCount: items.length };
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
