import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { getFullChoices } from '../../../form';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';

/**
 * Builds sort aggregation.
 *
 * @param sortFields Sort fields and their orders
 * @param fields Structure fields
 * @param context Request context
 * @returns Sort aggregation
 */
const getSortAggregation = async (
  sortFields: { field: string; order: string }[],
  fields: any[],
  context
): Promise<any[]> => {
  const aggregation = [];
  let aggregationSort = {};
  let aggregationAddFields = {};
  // Default aggregation
  if (!sortFields || !sortFields?.length) {
    sortFields = [{ field: 'createdAt', order: 'asc' }];
  }
  await sortFields.forEach(async (item: { field: string; order: string }) => {
    const field: any = fields.find((x) => x && x.name === item.field);
    const parentField: any =
      item.field && item.field.includes('.')
        ? fields.find((x) => x && x.name === item.field.split('.')[0])
        : '';
    // If we need to populate choices to sort on the text value
    if (field && (field.choices || field.choicesByUrl)) {
      const choices = await getFullChoices(field, context);
      const choicesValue = choices.map((x) => x.value);
      // Create aggregation to have text instead of values
      if (MULTISELECT_TYPES.includes(field.type)) {
        aggregationAddFields = {
          ...aggregationAddFields,
          ...{
            [`_${item.field}`]: {
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
                      $isArray: `$data.${item.field}`,
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
                              $in: ['$$this.value', `$data.${item.field}`],
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
        };
      } else {
        aggregationAddFields = {
          ...aggregationAddFields,
          ...{
            [`_${item.field}`]: {
              $let: {
                vars: {
                  choices,
                  choicesValue,
                },
                in: {
                  $arrayElemAt: [
                    '$$choices',
                    {
                      $indexOfArray: ['$$choicesValue', `$data.${item.field}`],
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
        };
      }
    }
    // Add the sort step to the aggregation
    aggregationSort = {
      ...aggregationSort,
      ...{
        [`${getSortField(item.field, parentField ? parentField : field)}`]:
          getSortOrder(item.order),
      },
    };
  });

  if (Object.keys(aggregationAddFields).length !== 0) {
    aggregation.push({
      $addFields: aggregationAddFields,
    });
  }
  if (Object.keys(aggregationSort).length !== 0) {
    aggregation.push({
      $sort: aggregationSort,
    });
  }

  return aggregation;
};

export default getSortAggregation;
