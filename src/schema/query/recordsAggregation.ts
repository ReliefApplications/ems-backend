import { GraphQLBoolean, GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import buildPipeline from '../../utils/aggregation/buildPipeline';
import mongoose from 'mongoose';
import getDisplayText from '../../utils/form/getDisplayText';
import { UserType } from '../types';
import {
  defaultRecordFields,
  selectableDefaultRecordFieldsFlat,
} from '../../const/defaultRecordFields';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import set from 'lodash/set';

/**
 * Takes an aggregation configuration as parameter.
 * Returns aggregated records data.
 */
export default {
  type: GraphQLJSON,
  args: {
    aggregation: { type: new GraphQLNonNull(GraphQLJSON) },
    withMapping: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    const ability: AppAbility = context.user.ability;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    let pipeline: any[] = [];
    const globalFilters: any[] = [
      {
        archived: { $ne: true },
      },
    ];
    // Check against records permissions if needed
    if (!ability.can('read', 'Record')) {
      const allFormPermissionsFilters = [];
      const forms = await Form.find({}).select('_id permissions');
      for (const form of forms) {
        if (form.permissions.canSeeRecords.length > 0) {
          const permissionFilters = getFormPermissionFilter(
            user,
            form,
            'canSeeRecords'
          );
          if (permissionFilters.length > 0) {
            allFormPermissionsFilters.push({
              $and: [{ form: form._id }, { $or: permissionFilters }],
            });
          }
        } else {
          allFormPermissionsFilters.push({ form: form._id });
        }
      }
      globalFilters.push({ $or: allFormPermissionsFilters });
    }
    // Build data source step
    const form = await Form.findById(
      args.aggregation.dataSource,
      'id name core fields resource'
    );
    if (args.aggregation.dataSource) {
      if (form.core) {
        globalFilters.push({
          resource: mongoose.Types.ObjectId(form.resource),
        });
      } else {
        globalFilters.push({
          form: mongoose.Types.ObjectId(args.aggregation.dataSource),
        });
      }
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
          const relatedForms = form.resource
            ? await Form.find({ resource: form.resource }).select('id name')
            : [{ name: form.name, id: form.id }];
          form.fields.push({
            name: 'form',
            choices: relatedForms.map((x) => {
              return { value: x.id, text: x.name };
            }),
          });
        }
        // Created By
        if (args.aggregation.sourceFields.includes('createdBy')) {
          pipeline = pipeline.concat([
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
        }
        // Last updated by
        if (args.aggregation.sourceFields.includes('lastUpdatedBy')) {
          if (!args.aggregation.sourceFields.includes('createdBy')) {
            pipeline = pipeline.concat([
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
      // If we're a core form, fetch related fields from other forms
      let relatedFields: any[] = [];
      if (form.core) {
        relatedFields = await Form.aggregate([
          {
            $match: {
              fields: {
                $elemMatch: {
                  resource: String(form.resource),
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
              'fields.resource': String(form.resource),
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
      }
      // Loop on fields to apply lookups for special fields
      for (const fieldName of args.aggregation.sourceFields) {
        const field = form.fields.find((x) => x.name === fieldName);
        // If we have resource(s) questions
        if (
          field &&
          (field.type === 'resource' || (field && field.type === 'resources'))
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
      buildPipeline(pipeline, args.aggregation.pipeline, form, context);
    }
    console.log(JSON.stringify(pipeline));
    // Build mapping step
    if (args.withMapping) {
      if (args.aggregation.mapping) {
        pipeline.push({
          $project: {
            category: `$${
              args.aggregation.mapping.category ||
              args.aggregation.mapping.xAxis
            }`,
            field: `$${
              args.aggregation.mapping.field || args.aggregation.mapping.yAxis
            }`,
            id: '$_id',
            ...(args.aggregation.mapping.series && {
              series: `$${args.aggregation.mapping.series}`,
            }),
          },
        });
      }
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
      if (args.withMapping) {
        // TODO: update with series
        const mappedFields = [
          { key: 'category', value: args.aggregation.mapping.xAxis },
          { key: 'field', value: args.aggregation.mapping.yAxis },
        ];
        // Mapping of aggregation fields and structure fields
        const fieldWithChoicesMapping = mappedFields.reduce((o, x) => {
          const formField = form.fields.find((field: any) => {
            return (
              x.value === field.name && (field.choices || field.choicesByUrl)
            );
          });
          if (formField) {
            return { ...o, [x.key]: formField };
          } else {
            return o;
          }
        }, {});
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
            }
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
