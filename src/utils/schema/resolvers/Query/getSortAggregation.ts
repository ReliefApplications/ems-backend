import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { getFullChoices } from '../../../form';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';

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
  context
): Promise<any[]> => {
  const field: any = fields.find((x) => x && x.name === sortField);
  const parentField: any =
    sortField && sortField.includes('.')
      ? fields.find((x) => x && x.name === sortField.split('.')[0])
      : '';
  const aggregation = [];
  // If we need to populate choices to sort on the text value
  if (field && (field.choices || field.choicesByUrl)) {
    const choices = await getFullChoices(field, context);
    const choicesValue = choices.map((x) => x.value);
    // Create aggregation to have text instead of values
    if (MULTISELECT_TYPES.includes(field.type)) {
      aggregation.push({
        $addFields: {
          [`_${sortField}`]: {
            $let: {
              vars: {
                choices,
              },
              in: {
                $map: {
                  input: {
                    $filter: {
                      input: '$$choices',
                      cond: {
                        $in: ['$$this.value', `$data.${sortField}`],
                      },
                    },
                  },
                  in: '$$this.text',
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
                choices,
                choicesValue,
              },
              in: {
                $arrayElemAt: [
                  '$$choices',
                  {
                    $indexOfArray: ['$$choicesValue', `$data.${sortField}`],
                  },
                ],
                // $getField: {
                //   field: 'text',
                //   input: {
                //     $arrayElemAt: [
                //       '$$choices',
                //       {
                //         $indexOfArray: ['$$choicesValue', `$data.${sortField}`],
                //       },
                //     ],
                //   },
                // },
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
