import { GraphQLBoolean, GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import buildPipeline from '../../utils/aggregation/buildPipeline';
import mongoose from 'mongoose';
// import { EJSON } from 'bson';
import getDisplayText from '../../utils/form/getDisplayText';
import { UserType } from '../types';
import {
  defaultRecordFields,
  selectableDefaultRecordFieldsFlat,
} from '../../const/defaultRecordFields';

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
      throw new GraphQLError(errors.userNotLogged);
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
      'core fields resource'
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
      throw new GraphQLError(errors.invalidAggregation);
    }
    // Build the source fields step
    if (args.aggregation.sourceFields && args.aggregation.sourceFields.length) {
      // If we have user fields
      if (
        args.aggregation.sourceFields.some((x) =>
          defaultRecordFields.some((y) => x === y.field && y.type === UserType)
        )
      ) {
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
                          $in: ['$$record_id', `$data.${relatedField.name}`],
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
      throw new GraphQLError(errors.invalidAggregation);
    }
    console.log('PIPELINE BEFORE PIPELINE', JSON.stringify(pipeline));
    // Build pipeline stages
    if (args.aggregation.pipeline && args.aggregation.pipeline.length) {
      buildPipeline(pipeline, args.aggregation.pipeline, form, context);
    }
    console.log('PIPELINE BEFORE MAPPING', JSON.stringify(pipeline));
    // Build mapping step
    if (args.withMapping) {
      if (args.aggregation.mapping) {
        pipeline.push({
          $project: {
            category: `$${args.aggregation.mapping.xAxis}`,
            field: `$${args.aggregation.mapping.yAxis}`,
            id: '$_id',
          },
        });
      }
    } else {
      pipeline.push({
        $addFields: {
          id: '$_id',
        },
      });
      pipeline.push({
        $limit: 10,
      });
    }
    const records = await Record.aggregate(pipeline);
    const itemsNames = [];
    const fieldUsed = args.withMapping
      ? [args.aggregation.mapping.xAxis, args.aggregation.mapping.yAxis]
      : Object.keys(records[0]);
    // remove _id from array
    if (!args.withMapping) {
      const index = fieldUsed.indexOf('_id');
      if (index > -1) {
        fieldUsed.splice(index, 1);
      }
    }

    // Gather all field and value needed for getDisplayText function
    form.fields.forEach((field: any) => {
      if (
        fieldUsed.includes(field.name) &&
        (field.items || field.choices || field.choicesByUrl)
      ) {
        let choiceArray = field.items
          ? field.items
          : field.choices
          ? field.choices
          : field.choicesByUrl;
        if (!choiceArray.length) {
          choiceArray = [choiceArray];
        }
        for (const item of choiceArray) {
          itemsNames.push({
            field: field,
            value: item.name ?? item.value,
            name: field.name,
          });
        }
      }
    });
    // For each record we look if we need to use the getDisplayText on category or field
    for await (const record of records) {
      if (!args.withMapping) {
        // we loop over each field of the record to get the text if needed
        for (const element in record) {
          const newElementItems = [];
          if (!['_id', 'id'].includes(element)) {
            for (const item of itemsNames) {
              if (item.name === element) {
                const newElementItem = await getDisplayText(
                  item.field,
                  item.value,
                  context
                );
                newElementItems.push(newElementItem);
                record[element] = newElementItems;
              }
            }
          }
        }
      } else {
        // we loop over category and field to get the display text
        const namesToLoop = ['category', 'field'];
        for (const name of namesToLoop) {
          const newElementItems = [];
          if (record[name]) {
            if (!record[name].length) {
              record[name] = Object.keys(record[name]);
            }
            for (const element of record[name]) {
              for (const item of itemsNames) {
                // console.log("item = ", item.value, "------- element = ", element);
                if (item.value === element) {
                  const newElementItem = await getDisplayText(
                    item.field,
                    item.value,
                    context
                  );
                  newElementItems.push(newElementItem);
                }
              }
            }
          }
          record[name] = newElementItems;
        }
      }
    }
    return records;
    // console.log('PIPELINE END', JSON.stringify(pipeline));
    // return Record.aggregate(pipeline);
  },
};
