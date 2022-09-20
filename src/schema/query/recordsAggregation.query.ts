import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import { cloneDeep, get, set } from 'lodash';
import { Form, Record, ReferenceData, Resource } from '../../models';
import extendAbilityForRecords from '../../security/extendAbilityForRecords';
import buildPipeline from '../../utils/aggregation/buildPipeline';
import buildReferenceDataAggregation from '../../utils/aggregation/buildReferenceDataAggregation';
import getDisplayText from '../../utils/form/getDisplayText';
import { UserType } from '../types';
import {
  defaultRecordFields,
  selectableDefaultRecordFieldsFlat,
} from '../../const/defaultRecordFields';

/**
 * Get created By stages
 *
 * @param pipeline current pipeline
 * @returns updated pipeline
 */
const createdByStages = (pipeline) => {
  return pipeline.concat([
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
  ]);
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
    const globalFilters: any[] = [
      {
        archived: { $ne: true },
      },
    ];

    // Check abilities
    const ability = await extendAbilityForRecords(user);
    const allFormPermissionsFilters = Record.accessibleBy(
      ability,
      'read'
    ).getFilter();
    globalFilters.push(allFormPermissionsFilters);

    // Build data source step
    const resource = await Resource.findById(args.resource, 'id name fields');
    if (resource) {
      globalFilters.push({
        resource: mongoose.Types.ObjectId(args.resource),
      });
      pipeline.push({
        $match: {
          $and: globalFilters,
        },
      });
    } else {
      throw new GraphQLError(context.i18next.t('errors.invalidAggregation'));
    }
    // Build the source fields step
    if (args.aggregation.sourceFields && args.aggregation.sourceFields.length) {
      // If we have user fields
      if (
        args.aggregation.sourceFields.some((x) =>
          defaultRecordFields.some(
            (y) => (x === y.field && y.type === UserType) || y.field === 'form'
          )
        )
      ) {
        // Form
        if (args.aggregation.sourceFields.includes('form')) {
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
        if (args.aggregation.sourceFields.includes('createdBy')) {
          pipeline = createdByStages(pipeline);
        }
        // Last updated by
        if (args.aggregation.sourceFields.includes('lastUpdatedBy')) {
          if (!args.aggregation.sourceFields.includes('createdBy')) {
            pipeline = createdByStages(pipeline);
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
      for (const fieldName of args.aggregation.sourceFields) {
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
          const referenceDataAggregation: any =
            await buildReferenceDataAggregation(referenceData, field, context);
          pipeline.push(referenceDataAggregation);
        }
      }
      pipeline.push({
        $project: {
          ...(args.aggregation.sourceFields as any[]).reduce(
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
    if (args.aggregation.pipeline && args.aggregation.pipeline.length) {
      buildPipeline(pipeline, args.aggregation.pipeline, resource, context);
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
        // TODO: update with series
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
        // Mapping of aggregation fields and structure fields
        const fieldWithChoicesMapping = await mappedFields.reduce(
          async (o, x) => {
            let lookAt = resource.fields;
            let lookFor = x.value;
            const [questionResource, question] = x.value.split('.');

            // in case it's a resource type question
            if (questionResource && question) {
              const formResource = resource.fields.find(
                (field: any) =>
                  resource === field.name && field.type === 'resource'
              );
              if (formResource) {
                lookAt = (await Resource.findById(formResource.resource))
                  .fields;
                lookFor = question;
              }
            }
            const formField = lookAt.find((field: any) => {
              return (
                lookFor === field.name && (field.choices || field.choicesByUrl)
              );
            });
            if (formField) {
              return { ...o, [x.key]: formField };
            } else {
              return o;
            }
          },
          {}
        );
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
      console.error(err);
      return items;
    }
  },
};
