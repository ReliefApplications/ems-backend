import { SortOrder } from 'mongoose';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { getFullChoices } from '../../../form';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getTranslatedFieldName from './getTranslatedFieldName';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';
import { SortDescriptor } from './normalizeSortDescriptors';

/**
 * Builds the aggregation stages (choice-resolution + sort) for a single sort
 * descriptor, and adds its resolved path/order to the shared sort stage.
 *
 * @param sortField Sort by field
 * @param sortOrder Sort order
 * @param fields Structure fields
 * @param context Request context
 * @param sortStage Shared compound $sort object, mutated in place
 * @returns Aggregation stages needed before the $sort stage (e.g. $addFields for choice resolution)
 */
const buildSortDescriptorAggregation = async (
  sortField: string,
  sortOrder: string,
  fields: any[],
  context: any,
  sortStage: Record<string, SortOrder>
): Promise<any[]> => {
  // Locale-based translation: replace the sort field with its sibling
  // translation field when one matches the user's locale.
  sortField = getTranslatedFieldName(sortField, fields, context?.locale);

  const field: any = fields.find((x) => x && x.name === sortField);
  const parentField: any =
    sortField && sortField.includes('.')
      ? fields.find((x) => x && x.name === sortField.split('.')[0])
      : '';
  const aggregation = [];
  // If we need to populate choices to sort on the text value
  if (
    field &&
    (field.choices || field.choicesByUrl || field.choicesByGraphQL)
  ) {
    const rawChoices = (await getFullChoices(field, context)) || [];
    // Resolve each choice's (possibly localized) text to the active locale so
    // that we sort on the displayed value rather than the raw locale object.
    const choices = rawChoices.map((choice: any) =>
      choice && typeof choice === 'object'
        ? {
            ...choice,
            text: resolveLocalizedString(choice.text, context?.locale),
          }
        : choice
    );
    const choicesValue = choices.map((x) => x.value);
    const choicesText = choices.map((x) => x?.text);
    // Create aggregation to have text instead of values
    if (MULTISELECT_TYPES.includes(field.type)) {
      aggregation.push({
        $addFields: {
          [`_${sortField}`]: {
            $let: {
              // accessible variables in the $in expression
              vars: {
                choices,
              },
              // expression to evaluate
              in: {
                $cond: {
                  // Check that field is array
                  if: {
                    $isArray: `$data.${sortField}`,
                  },
                  // Only apply on array fields
                  then: {
                    // apply to each item of expression
                    $map: {
                      // expression that resolves to an array
                      input: {
                        // filter array
                        $filter: {
                          // array to filter
                          input: '$$choices',
                          // filtering condition
                          cond: {
                            $in: ['$$this.value', `$data.${sortField}`],
                          },
                        },
                      },
                      // each item returns as text
                      in: '$$this.text',
                    },
                  },
                  // Skip
                  else: [],
                },
              },
            },
          },
        },
      });
    } else {
      aggregation.push({
        $addFields: {
          [`_${sortField}`]: {
            $let: {
              vars: {
                choicesText,
                choicesValue,
              },
              // Resolve the choice value to its localized display text so the
              // sort is performed on the translated label.
              in: {
                $arrayElemAt: [
                  '$$choicesText',
                  {
                    $indexOfArray: ['$$choicesValue', `$data.${sortField}`],
                  },
                ],
              },
            },
          },
        },
      });
    }
  }
  // Add this field's resolved path/order to the shared compound sort stage
  sortStage[getSortField(sortField, parentField ? parentField : field)] =
    getSortOrder(sortOrder);
  return aggregation;
};

/**
 * Builds sort aggregation for one or several sort descriptors, applied in
 * priority order (equivalent to a SQL `ORDER BY field1, field2, ...`).
 *
 * @param sortDescriptors Ordered list of sort descriptors to apply
 * @param fields Structure fields
 * @param context Request context
 * @returns Sort aggregation
 */
const getSortAggregation = async (
  sortDescriptors: SortDescriptor[],
  fields: any[],
  context: any
): Promise<any[]> => {
  if (!sortDescriptors || sortDescriptors.length === 0) {
    return [];
  }

  const aggregation: any[] = [];
  // Plain object: key insertion order gives us the sort priority order for
  // MongoDB's compound $sort stage.
  const sortStage: Record<string, SortOrder> = {};

  for (const descriptor of sortDescriptors) {
    const stages = await buildSortDescriptorAggregation(
      descriptor.field,
      descriptor.order,
      fields,
      context,
      sortStage
    );
    aggregation.push(...stages);
  }

  aggregation.push({ $sort: sortStage });
  return aggregation;
};

export default getSortAggregation;
