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
import getTranslatedFieldName from '../schema/resolvers/Query/getTranslatedFieldName';

/**
 * Unnests a nested field in a MongoDB aggregation pipeline and performs specified operations.
 *
 * @param {Array} pipeline - The MongoDB aggregation pipeline array to which stages will be added.
 * @param {string} parent - The parent field containing the nested array to be unnested.
 * @param {string} nestedField - The nested array field to be unnested.
 * @param {Array} [relatedFields] - Field definitions of the related resource `parent` points to,
 * when known. Used to apply the same locale-based translation substitution
 * ( `translateField` / `translateTo` ) applied to the root resource's own fields, so grid /
 * aggregation columns sourced from a relationship also respect the request locale instead of
 * always showing whichever field was stored as the base ( untranslated ) one.
 * @param {string} [locale] - Request locale, used to pick the right translated sibling field.
 * @returns {void}
 */
const unnestField = (
  pipeline,
  parent,
  nestedField,
  relatedFields?: any[],
  locale?: string
) => {
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
  // Locale-based translation: for every field of the related resource that
  // has a sibling translation matching the request locale, overwrite the
  // base field with its translated value, keeping the original field name
  // as the key so any later stage referencing it (group, sort, project…)
  // transparently gets the localized value. Mirrors the substitution
  // already applied to the root resource's own fields in
  // recordsAggregation.query.ts.
  if (locale && relatedFields?.length) {
    const translationAddFields = relatedFields.reduce((acc, field: any) => {
      if (!field?.name) return acc;
      const translatedField = getTranslatedFieldName(
        field.name,
        relatedFields,
        locale
      );
      if (translatedField !== field.name) {
        acc[`${parent}.${nestedField}.data.${field.name}`] = `$${parent}.${nestedField}.data.${translatedField}`;
      }
      return acc;
    }, {});
    if (Object.keys(translationAddFields).length) {
      pipeline.push({ $addFields: translationAddFields });
    }
  }
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
 * @param relatedResourcesFieldsByPath Optional map of the first path segment of a dot-notation
 * groupBy field (e.g. `patient` in `patient.name`) to the field definitions of the resource it
 * points to. When provided, locale-based translation (`translateField` / `translateTo`) is
 * applied to that relationship's fields the same way it already is for the root resource's own
 * fields, so a grouped column sourced from a relationship also respects the request locale.
 * Only the first hop of a multi-level relationship path is translated.
 */
const buildPipeline = (
  pipeline: any[],
  settings: any[],
  resource: Resource,
  context,
  relatedResourcesFieldsByPath: Record<string, any[]> = {}
): any => {
  for (const stage of settings) {
    switch (stage.type) {
      case PipelineStage.FILTER: {
        context = {
          ...context,
          resourceFieldsById: {
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
                // Only the first hop's related resource is known ahead of
                // time (see relatedResourcesFieldsByPath doc above); deeper
                // chains are unnested as before, without translation.
                const relatedFields =
                  i === 0 ? relatedResourcesFieldsByPath[parent] : undefined;
                unnestField(
                  pipeline,
                  parent,
                  nestedField,
                  relatedFields,
                  context?.locale
                );
              }
            }
            pipeline.push({
              $unwind: `$${fieldArray.slice(-1)}.${fieldToQuery}`,
            });
          } else {
            pipeline.push({
              $unwind: {
                path: `$${x.field}`,
                preserveNullAndEmptyArrays: x.keepNull || false,
              },
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
