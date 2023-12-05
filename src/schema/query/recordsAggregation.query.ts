import {
  GraphQLError,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import { cloneDeep, get, isEqual, set, unset } from 'lodash';
import {
  Aggregation,
  Form,
  Record as RecordModel,
  ReferenceData,
  Resource,
} from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import buildPipeline from '@utils/aggregation/buildPipeline';
import buildReferenceDataAggregation from '@utils/aggregation/buildReferenceDataAggregation';
import setDisplayText from '@utils/aggregation/setDisplayText';
import { UserType } from '../types';
import {
  defaultRecordFields,
  selectableDefaultRecordFieldsFlat,
} from '@const/defaultRecordFields';
import { logger } from '@services/logger.service';
import buildCalculatedFieldPipeline from '../../utils/aggregation/buildCalculatedFieldPipeline';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { accessibleBy } from '@casl/mongoose';
import { GraphQLDate } from 'graphql-scalars';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { CompositeFilterDescriptor } from '@const/compositeFilter';

/** Pagination default items per query */
const DEFAULT_FIRST = 10;

/** Fields not in the resource that can be aggregated on */
const DEFAULT_FIELDS = [
  'form',
  'lastUpdateForm',
  'createdAt',
  'createdBy',
  'modifiedAt',
  'id',
  'incrementalId',
];

/**
 * Get created By stages
 *
 * @param pipeline current pipeline
 * @returns updated pipeline
 */
const CREATED_BY_STAGES = [
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy.user',
      foreignField: '_id',
      as: 'createdBy',
    },
  },
  {
    $unwind: '$createdBy',
  },
];

/** Arguments for the recordsAggregation query */
type RecordsAggregationArgs = {
  resource: string | mongoose.Types.ObjectId;
  aggregation: string | mongoose.Types.ObjectId | Aggregation;
  mapping?: any;
  first?: number;
  skip?: number;
  at?: Date;
  sortField?: string;
  sortOrder?: string;
  contextFilters?: CompositeFilterDescriptor;
};

/**
 * Extracts the source fields from a filter
 *
 * @param filter the filter to extract the source fields from
 * @param allFields all the fields of the resource
 * @param fields the fields to add the source fields to
 */
const extractSourceFields = (
  filter: any,
  allFields: string[],
  fields: string[]
) => {
  if (filter.filters) {
    filter.filters.forEach((f) => {
      extractSourceFields(f, allFields, fields);
    });
  } else if (filter.field) {
    if (
      typeof filter.field === 'string' &&
      !fields.includes(filter.field) &&
      allFields.concat(DEFAULT_FIELDS).includes(filter.field)
    )
      fields.push(filter.field);
  }
};

/**
 * Build At aggregation, filtering out items created after this date, and using version that matches date
 *
 * @param at Date
 * @returns At aggregation
 */
const getAtAggregation = (at: Date) => {
  return [
    {
      $match: {
        createdAt: {
          $lte: at,
        },
      },
    },
    {
      $lookup: {
        from: 'versions',
        localField: 'versions',
        foreignField: '_id',
        pipeline: [
          {
            $match: {
              createdAt: {
                $lte: at,
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: '__version',
      },
    },
    {
      $unwind: {
        path: '$__version',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        data: {
          $cond: {
            if: { $ifNull: ['$__version', false] },
            then: '$__version.data',
            else: '$data',
          },
        },
      },
    },
  ];
};

/**
 * Take an aggregation configuration as parameter.
 * Return aggregated records data.
 */
export default {
  type: GraphQLJSON,
  args: {
    resource: { type: new GraphQLNonNull(GraphQLID) },
    aggregation: { type: new GraphQLNonNull(GraphQLJSON) },
    contextFilters: { type: GraphQLJSON },
    mapping: { type: GraphQLJSON },
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    sortField: { type: GraphQLString },
    sortOrder: { type: GraphQLString },
    at: { type: GraphQLDate },
  },
  async resolve(parent, args: RecordsAggregationArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    const first = args.first || DEFAULT_FIRST;
    checkPageSize(first);
    try {
      const user = context.user;
      // global variables
      let pipeline: any[] = [];

      const skip: number = get(args, 'skip', 0);

      // Build data source step
      // TODO: enhance if switching from azure cosmos to mongo
      const resource = await Resource.findById(args.resource, {
        name: 1,
        fields: 1,
        aggregations: 1,
      });

      // Check abilities
      const ability = await extendAbilityForRecords(user);
      const permissionFilters = RecordModel.find(
        accessibleBy(ability, 'read').Record
      ).getFilter();

      // As we only queried one aggregation
      let aggregation: any;
      // Aggregation is an id
      if (typeof args.aggregation === 'string') {
        aggregation = resource.aggregations.find((x) =>
          isEqual(x.id, args.aggregation)
        );
      } else {
        // Else, if it's supplied for the preview of the aggregation
        aggregation = args.aggregation;
      }

      const refDataNameMap: Record<string, string> = {};
      if (aggregation?.sourceFields && aggregation.pipeline) {
        if (args.contextFilters) {
          extractSourceFields(
            args.contextFilters,
            resource.fields.map((f) => f.name),
            aggregation.sourceFields
          );
          aggregation.pipeline.unshift({
            type: 'filter',
            form: args.contextFilters,
          });
        }
        // Go through the aggregation source fields to update possible refData field names
        for (const field of aggregation.sourceFields) {
          // find field in resource fields
          const resourceField = resource.fields.find((x) => x.name === field);

          // check if field is a refData field
          if (resourceField?.referenceData?.id) {
            const refData = await ReferenceData.findById(
              resourceField.referenceData.id
            );

            // if so, update the map
            if (refData)
              refData.fields.forEach((f) => {
                refDataNameMap[
                  `${field}.${f.graphQLFieldName}`
                ] = `${field}.${f.name}`;
              });
          }
        }

        const hasRefDataField = Object.keys(refDataNameMap).length > 0;
        if (hasRefDataField) {
          // update the aggregation pipeline with the actual field names from the refData
          let strPipeline = JSON.stringify(aggregation.pipeline);
          for (const [key, value] of Object.entries(refDataNameMap)) {
            strPipeline = strPipeline.replace(
              `"field":"${key}"`,
              `"field":"${value}"`
            );
          }

          aggregation.pipeline = JSON.parse(strPipeline);
        }
      }

      const mongooseFilter = {};
      // Check if resource exists and aggregation exists
      if (resource && aggregation) {
        Object.assign(
          mongooseFilter,
          { resource: new mongoose.Types.ObjectId(args.resource) },
          { archived: { $ne: true } }
        );
      } else {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // pipeline.push({
      //   $match: {
      //     $and: [mongooseFilter, permissionFilters],
      //   },
      // });

      // Build the source fields step
      if (aggregation.sourceFields && aggregation.sourceFields.length) {
        // If we have user fields
        if (
          aggregation.sourceFields.some((x) =>
            defaultRecordFields.some(
              (y) =>
                (x === y.field && y.type === UserType) ||
                ['form', 'lastUpdateForm'].includes(y.field)
            )
          )
        ) {
          // Form
          if (aggregation.sourceFields.includes('form')) {
            const relatedForms = await Form.find({
              resource: args.resource,
            }).select('id name');
            resource.fields.push({
              name: 'form',
              choices: relatedForms.map((x) => {
                return { value: x.id, text: x.name };
              }),
            });
          }
          // Created By
          if (aggregation.sourceFields.includes('createdBy')) {
            pipeline = pipeline.concat(CREATED_BY_STAGES);
          }
          // Last updated by
          if (aggregation.sourceFields.includes('lastUpdatedBy')) {
            if (!aggregation.sourceFields.includes('createdBy')) {
              pipeline = pipeline.concat(CREATED_BY_STAGES);
            }
            pipeline = pipeline.concat([
              {
                $addFields: {
                  lastVersion: {
                    $last: '$versions',
                  },
                },
              },
              {
                $lookup: {
                  from: 'versions',
                  localField: 'lastVersion',
                  foreignField: '_id',
                  as: 'lastVersion',
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'lastVersion.createdBy',
                  foreignField: '_id',
                  as: 'lastUpdatedBy',
                },
              },
              {
                $addFields: {
                  lastUpdatedBy: {
                    $last: '$lastUpdatedBy',
                  },
                },
              },
              {
                $addFields: {
                  lastUpdatedBy: {
                    $ifNull: ['$lastUpdatedBy', '$createdBy'],
                  },
                },
              },
            ]);
          }
        }
        // Fetch related fields from other forms
        const relatedFields: any[] = await Form.aggregate([
          {
            $match: {
              fields: {
                $elemMatch: {
                  resource: String(args.resource),
                  $or: [
                    {
                      type: 'resource',
                    },
                    {
                      type: 'resources',
                    },
                  ],
                },
              },
            },
          },
          {
            $unwind: '$fields',
          },
          {
            $match: {
              'fields.resource': String(args.resource),
              $or: [
                {
                  'fields.type': 'resource',
                },
                {
                  'fields.type': 'resources',
                },
              ],
            },
          },
          {
            $addFields: {
              'fields.form': '$_id',
            },
          },
          {
            $replaceRoot: {
              newRoot: '$fields',
            },
          },
        ]);
        pipeline.push({
          $addFields: {
            record_id: {
              $toString: '$_id',
            },
          },
        });
        // Loop on fields to apply lookups for special fields
        for (const fieldName of aggregation.sourceFields) {
          const field = resource.fields.find((x) => x.name === fieldName);
          // If field is a calculated field
          if (field && field.isCalculated) {
            pipeline.unshift(
              ...buildCalculatedFieldPipeline(
                field.expression,
                field.name,
                context.timeZone
              )
            );
          }

          // If we have resource(s) questions
          if (
            field &&
            (field.type === 'resource' || field.type === 'resources')
          ) {
            if (field.type === 'resource') {
              pipeline.push({
                $addFields: {
                  [`data.${fieldName}`]: {
                    $convert: {
                      input: `$data.${fieldName}`,
                      to: 'objectId',
                      onError: null,
                    },
                  },
                },
              });
            } else {
              pipeline.push({
                $addFields: {
                  [`data.${fieldName}`]: {
                    $map: {
                      input: `$data.${fieldName}`,
                      in: {
                        $convert: {
                          input: '$$this',
                          to: 'objectId',
                          onError: null,
                        },
                      },
                    },
                  },
                },
              });
            }
            pipeline.push({
              $lookup: {
                from: 'records',
                localField: `data.${fieldName}`,
                foreignField: '_id',
                as: `data.${fieldName}`,
              },
            });
            if (field.type === 'resource') {
              pipeline.push({
                $unwind: `$data.${fieldName}`,
              });
              pipeline.push({
                $addFields: {
                  [`data.${fieldName}.data._id`]: {
                    $toString: `$data.${fieldName}._id`,
                  },
                },
              });
            }
            pipeline.push({
              $addFields: selectableDefaultRecordFieldsFlat.reduce(
                (fields, selectableField) => {
                  if (!selectableField.includes('By')) {
                    return Object.assign(fields, {
                      [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}.${selectableField}`,
                    });
                  } else {
                    return Object.assign(fields, {
                      [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}._${selectableField}.user._id`,
                    });
                  }
                },
                {}
              ),
            });
            pipeline.push({
              $addFields: {
                [`data.${fieldName}`]: `$data.${fieldName}.data`,
              },
            });
          }
          // If we have a field referring to another form with a question targeting our source
          if (!field) {
            const relatedField = relatedFields.find(
              (x: any) => x.relatedName === fieldName
            );
            if (relatedField) {
              pipeline = pipeline.concat([
                {
                  $lookup: {
                    from: 'records',
                    localField: 'record_id',
                    foreignField: `data.${relatedField.name}`,
                    as: `data.${fieldName}`,
                  },
                },
                {
                  $addFields: {
                    [`data.${fieldName}`]: {
                      $filter: {
                        input: `$data.${fieldName}`,
                        cond: {
                          $eq: ['$$this.form', relatedField.form],
                        },
                      },
                    },
                  },
                },
                {
                  $addFields: selectableDefaultRecordFieldsFlat.reduce(
                    (fields, selectableField) => {
                      if (!selectableField.includes('By')) {
                        return Object.assign(fields, {
                          [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}.${selectableField}`,
                        });
                      } else {
                        return Object.assign(fields, {
                          [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}._${selectableField}.user._id`,
                        });
                      }
                    },
                    {}
                  ),
                },
                {
                  $addFields: {
                    [`data.${fieldName}`]: `$data.${fieldName}.data`,
                  },
                },
              ]);
            }
          }
          // If we have referenceData fields
          if (field && field.referenceData && field.referenceData.id) {
            const referenceData = await ReferenceData.findById(
              field.referenceData.id
            ).populate({
              path: 'apiConfiguration',
              model: 'ApiConfiguration',
              select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
            });
            const referenceDataAggregation: any[] =
              await buildReferenceDataAggregation(
                referenceData,
                field,
                context
              );
            pipeline.push(...referenceDataAggregation);
          }
        }
        pipeline.push({
          $project: {
            ...(aggregation.sourceFields as any[]).reduce(
              (o, field) =>
                Object.assign(o, {
                  [field]: selectableDefaultRecordFieldsFlat.includes(field)
                    ? 1
                    : `$data.${field}`,
                }),
              {}
            ),
          },
        });
      } else {
        throw new GraphQLError(
          context.i18next.t(
            'query.records.aggregation.errors.invalidAggregation'
          )
        );
      }
      // Make sure that the resource filter is made at the beginning of the aggregation
      pipeline.unshift(
        ...[
          {
            $match: {
              $and: [mongooseFilter, permissionFilters],
            },
          },
          ...(args.at ? getAtAggregation(new Date(args.at)) : []),
        ]
      );
      // Build pipeline stages
      if (aggregation.pipeline && aggregation.pipeline.length) {
        buildPipeline(pipeline, aggregation.pipeline, resource, context);
      }
      // Build mapping step
      if (args.mapping) {
        // Also check if any of the mapped fields are from referenceData
        // @TODO: Merge Antoine's code to remove the following fix
        // Change the mapping if fields are from refData
        for (const [graphqlName, name] of Object.entries(refDataNameMap)) {
          (['category', 'series', 'field'] as const).forEach((mappedField) => {
            if (
              args.mapping?.[mappedField] &&
              graphqlName.endsWith(`.${args.mapping[mappedField]}`)
            ) {
              args.mapping[mappedField] =
                name.split('.')[name.split('.').length - 1];
            }
          });
        }
        const mapping = args.mapping;
        pipeline.push({
          $project: {
            category: `$${mapping.category}`,
            field: `$${mapping.field}`,
            id: '$_id',
            ...(mapping.series && {
              series: `$${mapping.series}`,
            }),
          },
        });
      } else {
        // Only sending some examples of the queried data
        pipeline.push({
          $addFields: {
            id: '$_id',
          },
        });
        if (args.sortField && args.sortOrder) {
          pipeline.push({
            $sort: {
              [args.sortField]: args.sortOrder === 'asc' ? 1 : -1,
            },
          });
        }
        pipeline.push({
          $facet: {
            items: [{ $skip: skip }, { $limit: first }],
            totalCount: [
              {
                $count: 'count',
              },
            ],
          },
        });
      }
      // Get aggregated data
      const recordAggregation = await RecordModel.aggregate(pipeline);

      let items;
      let totalCount;
      if (args.mapping) {
        items = recordAggregation;
        totalCount = recordAggregation.length;
      } else {
        items = recordAggregation[0].items;
        totalCount = recordAggregation[0]?.totalCount[0]?.count || 0;
      }
      let copiedItems = cloneDeep(items);

      // If we have refData fields, revert back to the graphql names of the fields
      for (const [graphqlName, name] of Object.entries(refDataNameMap)) {
        copiedItems = copiedItems.map((item: any) => {
          const currVal = get(item, name);
          if (currVal) {
            set(item, graphqlName, currVal);
            unset(item, name);
          }

          // In case it was grouped by the refData field, the "field." prefix no longer exists
          const groupedVal = get(item, name.split('.')[1]);
          if (groupedVal) {
            set(item, graphqlName.split('.')[1], groupedVal);
            unset(item, name.split('.')[1]);
          }
          return item;
        });
      }

      // For each detected field with choices, set the value of each entry to be display text value and then return
      try {
        if (args.mapping && args.mapping.category && args.mapping.field) {
          const mappedFields = [
            { key: 'category', value: args.mapping.category },
            { key: 'field', value: args.mapping.field },
          ];
          if (args.mapping.series) {
            mappedFields.push({
              key: 'series',
              value: args.mapping.series,
            });
          }
          await setDisplayText(mappedFields, copiedItems, resource, context);
          return copiedItems;
        } else {
          const mappedFields = Object.keys(items[0] || {}).map((key) => ({
            key,
            value: key,
          }));
          await setDisplayText(mappedFields, copiedItems, resource, context);
          return { items: copiedItems, totalCount };
        }
      } catch (err) {
        logger.error(err.message, { stack: err.stack });
        return args.mapping ? items : { items, totalCount };
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
