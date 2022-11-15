import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import { cloneDeep, get, isEqual, set } from 'lodash';
import { Form, Record, ReferenceData, Resource } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import buildPipeline from '@utils/aggregation/buildPipeline';
import buildReferenceDataAggregation from '@utils/aggregation/buildReferenceDataAggregation';
import getDisplayText from '@utils/form/getDisplayText';
import { UserType } from '../types';
import {
  defaultRecordFields,
  selectableDefaultRecordFieldsFlat,
} from '@const/defaultRecordFields';
import { logger } from '../../services/logger.service';

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

/**
 * Take an aggregation configuration as parameter.
 * Return aggregated records data.
 */
export default {
  type: GraphQLJSON,
  args: {
    resource: { type: new GraphQLNonNull(GraphQLID) },
    aggregation: { type: new GraphQLNonNull(GraphQLID) },
    mapping: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // global variables
    let pipeline: any[] = [];

    // Build data source step
    // TODO: enhance if switching from azure cosmos to mongo
    const resource = await Resource.findById(args.resource, {
      name: 1,
      fields: 1,
      aggregations: 1,
    });

    // Check abilities
    const ability = await extendAbilityForRecords(user);
    const permissionFilters = Record.accessibleBy(ability, 'read').getFilter();

    // As we only queried one aggregation
    const aggregation = resource.aggregations.find((x) =>
      isEqual(x.id, args.aggregation)
    );
    const mongooseFilter = {};
    // Check if resource exists and aggregation exists
    if (resource && aggregation) {
      Object.assign(
        mongooseFilter,
        { resource: mongoose.Types.ObjectId(args.resource) },
        { archived: { $ne: true } }
      );
    } else {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }

    pipeline.push({
      $match: {
        $and: [mongooseFilter, permissionFilters],
      },
    });

    // Build the source fields step
    if (aggregation.sourceFields && aggregation.sourceFields.length) {
      // If we have user fields
      if (
        aggregation.sourceFields.some((x) =>
          defaultRecordFields.some(
            (y) => (x === y.field && y.type === UserType) || y.field === 'form'
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
      // Loop on fields to apply lookups for special fields
      for (const fieldName of aggregation.sourceFields) {
        const field = resource.fields.find((x) => x.name === fieldName);
        // If we have resource(s) questions
        if (
          field &&
          (field.type === 'resource' || field.type === 'resources')
        ) {
          if (field.type === 'resource') {
            pipeline.push({
              $addFields: {
                [`data.${fieldName}`]: { $toObjectId: `$data.${fieldName}` },
              },
            });
          } else {
            pipeline.push({
              $addFields: {
                [`data.${fieldName}`]: {
                  $map: {
                    input: `$data.${fieldName}`,
                    in: { $toObjectId: '$$this' },
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
          }
          pipeline.push({
            $addFields: selectableDefaultRecordFieldsFlat.reduce(
              (fields, selectableField) => {
                if (!selectableField.includes('By')) {
                  return Object.assign(fields, {
                    [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}.${selectableField}`,
                  });
                }
                return fields;
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
                  let: {
                    record_id: {
                      $toString: '$_id',
                    },
                  },
                  pipeline: [
                    {
                      $match: {
                        form: relatedField.form,
                      },
                    },
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $isArray: [`$data.${relatedField.name}`] },
                            {
                              $in: [
                                '$$record_id',
                                `$data.${relatedField.name}`,
                              ],
                            },
                          ],
                        },
                      },
                    },
                  ],
                  as: `data.${fieldName}`,
                },
              },
              {
                $addFields: selectableDefaultRecordFieldsFlat.reduce(
                  (fields, selectableField) => {
                    if (!selectableField.includes('By')) {
                      return Object.assign(fields, {
                        [`data.${fieldName}.data.${selectableField}`]: `$data.${fieldName}.${selectableField}`,
                      });
                    }
                    return fields;
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
            await buildReferenceDataAggregation(referenceData, field, context);
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
      throw new GraphQLError(context.i18next.t('errors.invalidAggregation'));
    }
    // Build pipeline stages
    if (aggregation.pipeline && aggregation.pipeline.length) {
      buildPipeline(pipeline, aggregation.pipeline, resource, context);
    }
    // Build mapping step
    if (args.mapping) {
      pipeline.push({
        $project: {
          category: `$${args.mapping.category}`,
          field: `$${args.mapping.field}`,
          id: '$_id',
          ...(args.mapping.series && {
            series: `$${args.mapping.series}`,
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
      pipeline.push({
        $limit: 10,
      });
    }
    // Get aggregated data
    const items = await Record.aggregate(pipeline);
    const copiedItems = cloneDeep(items);

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
        console.log(mappedFields);
        // Mapping of aggregation fields and structure fields
        const reducer = async (acc, x) => {
          let lookAt = resource.fields;
          let lookFor = x.value;
          const [questionResource, question] = x.value.split('.');

          // in case it's a resource.s type question, search for the related resource
          if (questionResource && question) {
            const formResource = resource.fields.find(
              (field: any) =>
                questionResource === field.name &&
                ['resource', 'resources'].includes(field.type)
            );
            if (formResource) {
              lookAt = (await Resource.findById(formResource.resource)).fields;
              lookFor = question;
            }
          }
          // then, search for related field
          const formField = lookAt.find((field: any) => {
            return (
              lookFor === field.name && (field.choices || field.choicesByUrl)
            );
          });
          console.log(x.key);
          if (formField) {
            console.log(formField);
            return { ...acc, [x.key]: formField };
          } else {
            return acc;
          }
        };
        const fieldWithChoicesMapping = await mappedFields.reduce(reducer, {});
        console.log(fieldWithChoicesMapping);
        // For each detected field with choices, set the value of each entry to be display text value
        for (const [key, field] of Object.entries(fieldWithChoicesMapping)) {
          for (const item of copiedItems) {
            const fieldValue = get(item, key, null);
            if (fieldValue) {
              const displayText = await getDisplayText(
                field,
                fieldValue,
                context
              );
              if (displayText) {
                set(item, key, displayText);
              }
            } else {
              if (key === 'field' && fieldValue) {
                set(item, key, Number(fieldValue));
              }
            }
          }
        }
        // For each entry, make sure the field is a number
        for (const item of copiedItems) {
          const fieldValue = get(item, 'field', null);
          if (fieldValue) {
            set(item, 'field', Number(fieldValue));
          }
        }
        return copiedItems;
      } else {
        return items;
      }
    } catch (err) {
      logger.error(err);
      return items;
    }
  },
};
