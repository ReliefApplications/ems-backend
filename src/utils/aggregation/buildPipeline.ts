import { GraphQLError } from 'graphql';
import { Resource } from '@models';
import {
  forbiddenKeywords,
  operatorsMapping,
  PipelineStage,
} from '@const/aggregation';
import getFilter from '../schema/resolvers/Query/getFilter';
import { isEmpty } from 'lodash';
import { selectableDefaultRecordFieldsFlat } from '@const/defaultRecordFields';
import { Context } from '@server/apollo/context';

/**
 * Unnests a nested field in a MongoDB aggregation pipeline and performs specified operations.
 *
 * @param {Array} pipeline - The MongoDB aggregation pipeline array to which stages will be added.
 * @param {string} parent - The parent field containing the nested array to be unnested.
 * @param {string} nestedField - The nested array field to be unnested.
 * @returns {void}
 */
const unnestField = (pipeline, parent, nestedField) => {
  pipeline.push({
    $set: {
      [`${parent}.${nestedField}`]: {
        $cond: {
          if: { $isArray: `$${parent}.${nestedField}` },
          then: `$${parent}.${nestedField}`,
          else: [`$${parent}.${nestedField}`],
        },
      },
    }, //resource questions are converted to array so map can still properly apply
  });
  pipeline.push({
    $addFields: {
      [`${parent}.${nestedField}`]: {
        $map: {
          input: `$${parent}.${nestedField}`,
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
  pipeline.push({
    $unwind: {
      path: `$${parent}`,
      preserveNullAndEmptyArrays: true,
    },
  });
  // If nestedField
  const USER_FIELDS = ['createdBy', 'lastUpdatedBy'];
  pipeline.push({
    $lookup: {
      from: USER_FIELDS.includes(nestedField) ? 'users' : 'records',
      localField: `${parent}.${nestedField}`,
      foreignField: '_id',
      as: `${parent}.${nestedField}`,
    },
  });
  if (USER_FIELDS.includes(nestedField)) {
    pipeline.push({
      $addFields: {
        [`${parent}.${nestedField}.data.name`]: `$${parent}.${nestedField}.name`,
        [`${parent}.${nestedField}.data.username`]: `$${parent}.${nestedField}.username`,
      },
    });
  } else {
    pipeline.push({
      $addFields: selectableDefaultRecordFieldsFlat.reduce(
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        (fields, selectableField) => {
          if (!selectableField.includes('By')) {
            return Object.assign(fields, {
              [`${parent}.${nestedField}.data.${selectableField}`]: `$${parent}.${nestedField}.${selectableField}`,
            });
          } else {
            return Object.assign(fields, {
              [`${parent}.${nestedField}.data.${selectableField}`]: `$${parent}.${nestedField}._${selectableField}.user._id`,
            });
          }
        },
        {}
      ),
    });
  }
  pipeline.push({
    $addFields: {
      [`${parent}.${nestedField}`]: `$${parent}.${nestedField}.data`,
    },
  });
  pipeline.push({
    $project: {
      [`${nestedField}`]: `$${parent}.${nestedField}`,
    },
  });
  pipeline.push({
    $unwind: `$${nestedField}`,
  });
};

/**
 * Builds a addFields pipeline stage.
 *
 * @param settings Stage settings.
 * @returns Mongo pipeline stage.
 */
const addFields = (
  settings: { name: string; expression: { operator: string; field: string } }[]
): any => {
  return settings.reduce((o, value) => {
    const operator = operatorsMapping.find(
      (x) => x.id === value.expression.operator
    );
    return Object.assign(o, {
      [value.name ? value.name : value.expression.operator]: operator.mongo(
        value.expression.field
      ),
    });
  }, {});
};

/**
 * Builds pipeline from list of stage configurations.
 *
 * @param pipeline Current pipeline.
 * @param settings Stage configurations.
 * @param resource Current resource.
 * @param context request context.
 */
const buildPipeline = (
  pipeline: any[],
  settings: any[],
  resource: Resource,
  context: Context
): any => {
  for (const stage of settings) {
    switch (stage.type) {
      case PipelineStage.FILTER: {
        context = {
          ...context,
          resourceFieldsById: {
            ...(context.resourceFieldsById ?? {}),
            [resource.id]: resource.fields,
          },
        };
        pipeline.push({
          $match: getFilter(stage.form, resource.fields, context, ''),
        });
        break;
      }
      case PipelineStage.SORT: {
        // Try to group sort stages together ( when they are following )
        if (pipeline.length > 0) {
          const previousStage = pipeline[pipeline.length - 1];
          if (Object.keys(previousStage)[0] === '$sort') {
            // Join with previous sort criteria to add a single sort stage with all fields with criteria and not multiple sort stages
            // (necessary for sort on multiple fields to work)
            previousStage.$sort = {
              ...previousStage.$sort,
              [stage.form.field]: stage.form.order === 'asc' ? 1 : -1,
            };
            break;
          }
        }
        pipeline.push({
          $sort: {
            [stage.form.field]: stage.form.order === 'asc' ? 1 : -1,
          },
        });
        break;
      }
      case PipelineStage.GROUP: {
        stage.form.groupBy.map((x) => {
          if (!x.field) {
            return;
          }
          if (x.field.includes('.')) {
            const fieldArray = x.field.split('.');
            let parent = '';
            let nestedField = '';
            const fieldToQuery = fieldArray.pop();
            pipeline.push({
              $unwind: `$${fieldArray[0]}`,
            });
            if (fieldArray.length > 1) {
              for (let i = 0; i < fieldArray.length - 1; i++) {
                parent = fieldArray[i];
                nestedField = fieldArray[i + 1];
                unnestField(pipeline, parent, nestedField);
              }
            }
            pipeline.push({
              $unwind: `$${fieldArray.slice(-1)}.${fieldToQuery}`,
            });
          } else {
            pipeline.push({
              $unwind: `$${x.field}`,
            });
          }
          if (x.expression && x.expression.operator) {
            pipeline.push({
              $addFields: addFields([
                {
                  name: x.field,
                  expression: {
                    operator: x.expression.operator,
                    field: x.field,
                  },
                },
              ]),
            });
          }
        });

        const groupId = stage.form.groupBy.reduce((o, x, i) => {
          if (!x.field) return o;
          return Object.assign(o, {
            [`_id${i}`]: {
              $toString: `$${x.field.split('.').slice(-2).join('.')}`,
            },
          });
        }, {});

        pipeline.push({
          $group: {
            _id: isEmpty(groupId) ? null : groupId,
            ...addFields(stage.form.addFields),
          },
        });

        pipeline.push({
          $project: {
            ...stage.form.groupBy.reduce((o, x, i) => {
              if (!x.field) return o;
              const projectTo =
                x.field.split('.').length > 1
                  ? x.field.split('.').pop()
                  : x.field;
              return Object.assign(o, { [projectTo]: `$_id.${`_id${i}`}` });
            }, {}),
            _id: 0,
            ...(stage.form.addFields as any[]).reduce(
              (o, addField) =>
                Object.assign(o, {
                  [addField.name
                    ? addField.name
                    : addField.expression.operator]: 1,
                }),
              {}
            ),
          },
        });
        break;
      }
      case PipelineStage.ADD_FIELDS: {
        pipeline.push({
          $addFields: addFields(stage.form),
        });
        break;
      }
      case PipelineStage.UNWIND: {
        if (stage.form.field.includes('.')) {
          const fieldArray: string[] = stage.form.field.split('.');
          for (let i = 0; i < fieldArray.length; i++) {
            pipeline.push({
              $unwind: `$${fieldArray.slice(0, i + 1).join('.')}`,
            });
          }
        } else {
          pipeline.push({
            $unwind: `$${stage.form.field}`,
          });
        }
        break;
      }
      case PipelineStage.LABEL: {
        const { copyFrom, field: copyTo } = stage.form;

        const questionsWithChoices = resource.fields.filter(
          (item) => 'choices' in item && item.choices
        );

        // If the we are copying from a question with choices
        if (questionsWithChoices.map((item) => item.name).includes(copyFrom)) {
          const questionType = questionsWithChoices.find(
            (item) => item.name === copyFrom
          ).type;
          const questionChoices = questionsWithChoices.find(
            (item) => item.name === copyFrom
          ).choices;

          const colChoiceMap: {
            col: string;
            value: any;
            label: string;
          }[] = [];

          const generateSwitchOperation = (val: string, col: string) => ({
            $cond: {
              if: { $isArray: val },
              then: {
                $map: {
                  input: val,
                  as: 'value',
                  in: {
                    $switch: {
                      branches: [
                        ...colChoiceMap.map((choice) => ({
                          case: {
                            $and: [
                              {
                                $eq: ['$$value', choice.value],
                              },
                              {
                                $eq: [
                                  {
                                    $toString: col,
                                  },
                                  choice.col,
                                ],
                              },
                            ],
                          },
                          then: choice.label,
                        })),
                      ],
                      default: '$$value',
                    },
                  },
                },
              },
              else: {
                $switch: {
                  branches: [
                    ...colChoiceMap.map((choice) => ({
                      case: {
                        $and: [
                          {
                            $eq: [val, choice.value],
                          },
                          {
                            $eq: [col, choice.col],
                          },
                        ],
                      },
                      then: choice.label,
                    })),
                  ],
                  default: val,
                },
              },
            },
          });

          questionsWithChoices
            .find((item) => item.name === copyFrom)
            .columns?.forEach((column: any) => {
              const columnChoices = column.choices || questionChoices;

              colChoiceMap.push(
                ...columnChoices.map((choice) => ({
                  col: column.name,
                  value: choice.value,
                  label: choice.text,
                }))
              );
            });

          switch (questionType) {
            // Matrixdropdown is an object of objects of either arrays or single values
            case 'matrixdropdown': {
              pipeline.push({
                $addFields: {
                  [copyTo]: {
                    $arrayToObject: {
                      $map: {
                        input: { $objectToArray: `$${copyTo}` },
                        as: 'row',
                        in: {
                          k: '$$row.k',
                          v: {
                            $arrayToObject: {
                              $map: {
                                input: { $objectToArray: '$$row.v' },
                                as: 'column',
                                in: {
                                  k: '$$column.k',
                                  v: generateSwitchOperation(
                                    '$$column.v',
                                    '$$column.k'
                                  ),
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  id: 1,
                },
              });
              break;
            }
            // Matrixdynamic is an array of objects of either arrays or single values
            case 'matrixdynamic': {
              pipeline.push({
                $addFields: {
                  [copyTo]: {
                    $map: {
                      input: `$${copyTo}`,
                      as: 'ans',
                      in: {
                        $arrayToObject: {
                          $map: {
                            input: { $objectToArray: '$$ans' },
                            as: 'col',
                            in: {
                              k: '$$col.k',
                              v: generateSwitchOperation('$$col.v', '$$col.k'),
                            },
                          },
                        },
                      },
                    },
                  },
                },
              });
              break;
            }
            // Everything else is either an array or single value
            default: {
              pipeline.push({
                $addFields: {
                  [copyTo]: {
                    $cond: {
                      if: { $isArray: `$${copyTo}` },
                      then: {
                        $map: {
                          input: `$${copyTo}`,
                          as: 'value',
                          in: {
                            $switch: {
                              branches: [
                                ...questionChoices.map((choice) => ({
                                  case: {
                                    $eq: ['$$value', choice.value],
                                  },
                                  then: choice.text,
                                })),
                              ],
                              default: '$$value',
                            },
                          },
                        },
                      },
                      else: {
                        $switch: {
                          branches: [
                            ...questionChoices.map((choice) => ({
                              case: {
                                $eq: [`$${copyTo}`, choice.value],
                              },
                              then: choice.text,
                            })),
                          ],
                          default: `$${copyTo}`,
                        },
                      },
                    },
                  },
                },
              });
              break;
            }
          }
        }
        break;
      }

      case PipelineStage.USER: {
        // If the stage is a user stage, we need to add a lookup stage to get the user data
        // to represents which user information we want to get, email or name
        const { field: userField, to } = stage.form;
        const newField = to === 'email' ? 'username' : to;

        pipeline.push({
          $addFields: {
            [userField]: {
              $cond: {
                if: { $isArray: `$${userField}` },
                then: {
                  $map: {
                    input: `$${userField}`,
                    as: 'user',
                    in: {
                      $convert: {
                        input: '$$user',
                        to: 'objectId',
                        onError: null,
                      },
                    },
                  },
                },
                else: {
                  $convert: {
                    input: `$${userField}`,
                    to: 'objectId',
                    onError: null,
                  },
                },
              },
            },
          },
        });

        // do lookup on objectId
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: userField,
            foreignField: '_id',
            as: userField,
          },
        });

        // If the user field is an array, we need to project the user data
        pipeline.push({
          $addFields: {
            [userField]: `$${userField}.${newField}`,
          },
        });

        break;
      }

      case PipelineStage.CUSTOM: {
        const custom: string = stage.form.raw;
        if (forbiddenKeywords.some((x: string) => custom.includes(x))) {
          throw new GraphQLError(
            context.i18next.t(
              'utils.aggregation.buildPipeline.errors.invalidCustomStage'
            )
          );
        }
        try {
          pipeline.push(JSON.parse(custom));
        } catch {
          throw new GraphQLError(
            context.i18next.t(
              'utils.aggregation.buildPipeline.errors.invalidCustomStage'
            )
          );
        }
        break;
      }
      default: {
        break;
      }
    }
  }
};

export default buildPipeline;
