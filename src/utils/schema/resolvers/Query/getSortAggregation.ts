import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { getFullChoices } from '../../../form';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getTranslatedFieldName from './getTranslatedFieldName';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';

/**
 * Builds sort aggregation.
 *
 * @param sortField Sort by field
 * @param sortOrder Sort order
 * @param fields Structure fields
 * @param context Request context
 * @returns Sort aggregation
 */
const getSortAggregation = async (
  sortField: string,
  sortOrder: string,
  fields: any[],
  context: any
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
  // Add the sort step to the aggregation
  aggregation.push({
    $sort: {
      [`${getSortField(sortField, parentField ? parentField : field)}`]:
        getSortOrder(sortOrder),
    },
  });
  return aggregation;
};

export default getSortAggregation;
