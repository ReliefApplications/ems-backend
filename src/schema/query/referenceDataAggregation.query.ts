import {
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceData } from '@models';
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
  cloneDeep,
  eq,
  isNil,
  get,
} from 'lodash';
import { graphQLAuthCheck } from '@schema/shared';
import { CustomAPI } from '@server/apollo/dataSources';
import { GraphQLDate } from 'graphql-scalars';
import mongoose from 'mongoose';
import { CompositeFilterDescriptor } from '@const/compositeFilter';

/**
 * Apply the filter provided to the specified field
 *
 * @param data Array of fields
 * @param filter Filter object
 * @returns Returns a boolean with the result of the filter
 */
const applyFilters = (data: any, filter: any): boolean => {
  if (filter.logic) {
    switch (filter.logic) {
      case 'or':
        return filter.filters.some((f: any) => applyFilters(data, f));
      case 'and':
        return filter.filters.every((f: any) => applyFilters(data, f));
      default:
        return data;
    }
  }

  if (filter.field && filter.operator) {
    const value = get(data, filter.field);
    let intValue: number;
    try {
      intValue = Number(filter.value);
    } catch {}
    switch (filter.operator) {
      case 'eq':
        return eq(value, String(filter.value)) || eq(value, intValue);
      case 'ne':
      case 'neq':
        return !(eq(value, String(filter.value)) || eq(value, intValue));
      case 'gt':
        return !isNil(value) && value > filter.value;
      case 'gte':
        return !isNil(value) && value >= filter.value;
      case 'lt':
        return !isNil(value) && value < filter.value;
      case 'lte':
        return !isNil(value) && value <= filter.value;
      case 'isnull':
        return isNil(value);
      case 'isnotnull':
        return !isNil(value);
      case 'startswith':
        return !isNil(value) && value.startsWith(filter.value);
      case 'endswith':
        return !isNil(value) && value.endsWith(filter.value);
      case 'contains':
        return !isNil(value) && value.includes(filter.value);
      case 'doesnotcontain':
        return isNil(value) || !value.includes(filter.value);
      default:
        // For any unknown operator, we return false
        return false;
    }
  }
};

/**
 * filters the data with the given pipeline filter
 *
 * @param data data to be filtered
 * @param filter pipeline filter
 * @returns filtered data
 */
const getFilteredArray = (data: any, filter: any): any => {
  return data.filter((item) => {
    return applyFilters(item, filter);
  });
};

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
 * @param referenceDataFields referenceData fields
 * @returns filtered data
 */
const procPipelineStep = (
  pipelineStep,
  data,
  sourceFields,
  referenceDataFields
) => {
  switch (pipelineStep.type) {
    case 'group':
      const operators = pipelineStep.form?.addFields?.map(
        (operator) => operator.expression
      );
      const mappedData = data.map((item) => {
        const newItem = Object.keys(item).reduce((obj, key) => {
          const currField = referenceDataFields.find((f) => f.name === key);
          if (currField) {
            obj[currField.graphQLFieldName ?? key] = item[key];
          }
          return obj;
        }, {});
        return newItem;
      });
      const keysToGroupBy = pipelineStep.form.groupBy.map((key) => key.field);
      data = groupBy(mappedData, (dataKey) =>
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

/** Arguments for the recordsAggregation query */
type ReferenceDataAggregationArgs = {
  referenceData: string | mongoose.Types.ObjectId;
  aggregation: string | mongoose.Types.ObjectId;
  mapping?: any;
  pipeline?: any[];
  sourceFields?: any[];
  first?: number;
  skip?: number;
  at?: Date;
  sortField?: string;
  sortOrder?: string;
  contextFilters?: CompositeFilterDescriptor;
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
    pipeline: { type: GraphQLJSON },
    sourceFields: { type: GraphQLJSON },
    contextFilters: { type: GraphQLJSON },
    mapping: { type: GraphQLJSON },
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    sortOrder: { type: GraphQLString },
    sortField: { type: GraphQLString },
    at: { type: GraphQLDate },
  },
  async resolve(parent, args: ReferenceDataAggregationArgs, context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    // If first equal to -1, no need for page size check, that means we want to fetch all records
    if (first > 0) {
      checkPageSize(first);
    }
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
      // sourceFields and pipeline from args have priority over current aggregation ones
      // for the aggregation preview feature on aggregation builder
      const sourceFields = args.sourceFields ?? aggregation.sourceFields;
      const pipeline = args.pipeline ?? aggregation.pipeline ?? [];
      // Build the source fields step
      if (sourceFields && sourceFields.length && pipeline) {
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
          // const transformer = new DataTransformer(
          //   referenceData.fields,
          //   rawItems
          // );
          // let items = transformer.transformData();
          let items = cloneDeep(rawItems);
          for (const item of items) {
            //we remove white spaces as they end up being a mess, but probably a temp fix as I think we should remove white spaces straight when saving ref data in mongo
            for (const key in item) {
              if (/\s/g.test(key)) {
                item[key.replace(/ /g, '')] = item[key];
                delete item[key];
              }
            }
          }
          if (args.contextFilters) {
            pipeline.unshift({
              type: 'filter',
              form: args.contextFilters,
            });
          }
          // Build the pipeline
          if (args.sortField && args.sortOrder) {
            pipeline.push({
              type: 'sort',
              form: {
                field: args.sortField,
                order: args.sortOrder,
              },
            });
          }

          pipeline.forEach((step: any) => {
            items = procPipelineStep(
              step,
              items,
              sourceFields,
              referenceData.fields
            );
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
