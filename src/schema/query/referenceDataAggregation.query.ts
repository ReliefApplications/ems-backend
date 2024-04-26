import {
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DataTransformer, ReferenceData } from '@models';
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
  flatMap,
  map,
  isArray,
  isEmpty,
  isBoolean,
  isString,
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
        return filter.filters.length
          ? filter.filters.some((f: any) => applyFilters(data, f))
          : true;
      case 'and':
        return filter.filters.every((f: any) => applyFilters(data, f));
      default:
        return data;
    }
  }

  if (filter.field && filter.operator) {
    const value = get(data, filter.field);
    let intValue: number | null;
    try {
      intValue = Number(filter.value);
    } catch {
      intValue = null;
    }
    switch (filter.operator) {
      case 'eq':
        if (isBoolean(value)) {
          return eq(value, filter.value);
        } else {
          return eq(value, String(filter.value)) || eq(value, intValue);
        }
      case 'ne':
      case 'neq':
        if (isBoolean(value)) {
          return !eq(value, filter.value);
        } else {
          return !(eq(value, String(filter.value)) || eq(value, intValue));
        }
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
        if (isString(filter.value)) {
          const regex = new RegExp(filter.value, 'i');
          if (isString(value)) {
            return !isNil(value) && regex.test(value);
          } else {
            return !isNil(value) && value.includes(filter.value);
          }
        } else {
          return !isNil(value) && value.includes(filter.value);
        }
      case 'doesnotcontain':
        if (isString(filter.value)) {
          const regex = new RegExp(filter.value, 'i');
          if (isString(value)) {
            return isNil(value) || !regex.test(value);
          } else {
            return isNil(value) || !value.includes(filter.value);
          }
        } else {
          return isNil(value) || !value.includes(filter.value);
        }
      case 'in':
        if (isString(value)) {
          if (isArray(filter.value)) {
            return !isNil(filter.value) && filter.value.includes(value);
          } else {
            const regex = new RegExp(value, 'i');
            return !isNil(filter.value) && regex.test(filter.value);
          }
        } else {
          return !isNil(filter.value) && filter.value.includes(value);
        }
      case 'notint':
        if (isString(value)) {
          if (isArray(filter.value)) {
            return isNil(filter.value) || !filter.value.includes(value);
          } else {
            const regex = new RegExp(value, 'i');
            return isNil(filter.value) || !regex.test(filter.value);
          }
        } else {
          return isNil(filter.value) || !filter.value.includes(value);
        }
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
  if (isEmpty(filter)) {
    return data;
  } else {
    return data.filter((item) => {
      return applyFilters(item, filter);
    });
  }
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
        sum: sum(data.map((element) => Number(get(element, operator.field)))),
      };
    case 'avg':
      return {
        avg: mean(data.map((element) => Number(get(element, operator.field)))),
      };
    case 'count':
      return { count: size(data) };
    case 'max':
      return {
        max: max(data.map((element) => Number(get(element, operator.field)))),
      };
    case 'min':
      return {
        min: min(data.map((element) => Number(get(element, operator.field)))),
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
      data = groupBy(data, (item) =>
        keysToGroupBy.map((key) => get(item, key))
      );
      // Mapping between new group keys and data path
      const mapping: Record<string, string> = {};
      for (const key of keysToGroupBy) {
        // Check if the key contains a '.'
        if (key.includes('.')) {
          // Split the key by '.' and extract the last part
          const newKey = key.split('.').pop();
          mapping[newKey] = key;
        } else {
          mapping[key] = key;
        }
      }

      /**
       * Transform object, using mapping object
       *
       * @param obj Object to transform
       * @returns Transformed object
       */
      const transformObject = (obj: Record<string, any>) => {
        const newObj: Record<string, any> = {};
        for (const [key, path] of Object.entries(mapping)) {
          newObj[key] = get(obj, path);
        }
        return newObj;
      };

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
          ...transformObject(data[key].initialData[0]),
        });
      }
      return dataToKeep;
    case 'filter':
      return getFilteredArray(data, pipelineStep.form);
    case 'sort':
      return orderBy(data, pipelineStep.form.field, pipelineStep.form.order);
    case 'unwind':
      return flatMap(data, (item) => {
        let fieldToUnwind = get(item, pipelineStep.form.field);
        try {
          fieldToUnwind =
            typeof fieldToUnwind === 'string'
              ? JSON.parse(fieldToUnwind.replace(/'/g, '"')) //replace single quotes to correctly get JSON fields
              : fieldToUnwind;
        } catch {
          logger.error(`error while parsing field ${fieldToUnwind}`);
        }
        if (isArray(fieldToUnwind)) {
          return map(fieldToUnwind, (value) => {
            return { ...cloneDeep(item), [pipelineStep.form.field]: value };
          });
        }
        return item;
      });
    case 'addFields':
      pipelineStep.form?.map((elt) => {
        switch (elt.expression.operator) {
          case 'add':
            data.map((obj: any) => {
              obj[elt.name] = get(obj, elt.expression.field);
            });
            break;
          case 'month':
            data.map((obj: any) => {
              try {
                const month =
                  new Date(get(obj, elt.expression.field)).getMonth() + 1;
                const monthAsString =
                  month < 10 ? '0' + month : month.toString();
                const dateWithMonth =
                  new Date(get(obj, elt.expression.field)).getFullYear() +
                  '-' +
                  monthAsString;
                obj[elt.name] = dateWithMonth;
              } catch {
                obj[elt.name] = undefined;
              }
            });
            break;
          case 'year':
            data.map((obj: any) => {
              try {
                const year = new Date(
                  get(obj, elt.expression.field)
                ).getFullYear();
                const yearAsString = year.toString();
                obj[elt.name] = yearAsString;
              } catch {
                obj[elt.name] = undefined;
              }
            });
            break;
          case 'day':
            data.map((obj: any) => {
              try {
                const date = new Date(get(obj, elt.expression.field));
                const dayAsString =
                  date.getFullYear() +
                  '-' +
                  (date.getMonth() + 1).toString() +
                  '-' +
                  (date.getDate() + 1).toString();
                obj[elt.name] = dayAsString;
              } catch {
                obj[elt.name] = undefined;
              }
            });
            break;
          case 'week':
            data.map((obj: any) => {
              try {
                const date = new Date(get(obj, elt.expression.field));
                const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
                const pastDaysOfYear =
                  (date.valueOf() - firstDayOfYear.valueOf()) / 86400000;
                const weekNo = Math.ceil(
                  (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
                );
                const dateWithWeek = date.getFullYear() + '-week' + weekNo;
                obj[elt.name] = dateWithWeek;
              } catch {
                obj[elt.name] = undefined;
              }
            });
            break;
          case 'multiply':
            data.map((obj: any) => {
              obj[elt.name] = get(obj, elt.expression.field);
            });
            break;
        }
      });
      return data;
    default:
      logger.error('Aggregation not supported yet');
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
  graphQLVariables: any;
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
    graphQLVariables: { type: GraphQLJSON },
    mapping: { type: GraphQLJSON },
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    sortOrder: { type: GraphQLString },
    sortField: { type: GraphQLString },
    at: { type: GraphQLDate },
  },
  async resolve(parent, args: ReferenceDataAggregationArgs, context) {
    // Authentication check
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
                referenceData.apiConfiguration as any,
                args.graphQLVariables
              )) || [];
          }
          const transformer = new DataTransformer(
            referenceData.fields,
            cloneDeep(rawItems)
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
            items = procPipelineStep(step, items, sourceFields);
          });
          if (args.mapping) {
            return items.map((item) => {
              return {
                category: get(item, args.mapping.category),
                field: get(item, args.mapping.field),
                ...(args.mapping.series && {
                  series: get(item, args.mapping.series),
                }),
              };
            });
          }
          return { items: items, totalCount: items.length };
        } catch (err) {
          logger.error(err.message, { stack: err.stack });
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
