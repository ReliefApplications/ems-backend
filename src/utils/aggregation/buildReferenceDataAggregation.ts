import { referenceDataType } from '@const/enumTypes';
import { ReferenceData } from '@models';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { CustomAPI } from '../../server/apollo/dataSources';
import { logger } from '@lib/logger';

/**
 * Builds a ReferenceData aggregation to populate the corresponding field.
 *
 * @param referenceData ReferenceData to populate
 * @param field Field using the ReferenceData
 * @param context Request context
 * @returns ReferenceData aggregation
 */
const buildReferenceDataAggregation = async (
  referenceData: ReferenceData,
  field: any,
  context: any
): Promise<any[]> => {
  let items: any[] = [];
  try {
    // If it's coming from an API Configuration, uses a dataSource, else extract items from object.
    if (referenceData.type !== referenceDataType.static) {
      const dataSource: CustomAPI =
        context.dataSources[(referenceData.apiConfiguration as any).name];
      items = await dataSource.getReferenceDataItems(
        referenceData,
        referenceData.apiConfiguration as any
      );
    } else {
      items = referenceData.data;
    }
  } catch (err) {
    // Log error but continue execution
    logger.error(err.message, { stack: err.stack });
  }

  // We map the items to create objects with the graphQLFieldName as key and the value as value.
  const mappedItems = items.map((item) => {
    const newItem = Object.keys(item).reduce((obj, key) => {
      const currField = referenceData.fields.find((f) => f.name === key);
      if (currField) {
        obj[currField.graphQLFieldName ?? key] = item[key];
      }
      return obj;
    }, {});

    return newItem;
  });

  const itemsIds = items.map((item) => item[referenceData.valueField]);
  const valueFieldGraphqlName = referenceData.fields.find(
    (f) => f.name === referenceData.valueField
  )?.graphQLFieldName;

  if (MULTISELECT_TYPES.includes(field.type)) {
    return [
      {
        $addFields: {
          [`data.${field.name}`]: {
            $cond: {
              if: {
                $ne: [{ $type: `$data.${field.name}` }, 'array'],
              },
              then: [],
              else: `$data.${field.name}`,
            },
          },
        },
      },
      {
        $addFields: {
          [`data.${field.name}`]: {
            $let: {
              vars: {
                items: mappedItems,
              },
              in: {
                $filter: {
                  input: '$$items',
                  cond: {
                    $in: [
                      `$$this.${
                        valueFieldGraphqlName ?? referenceData.valueField
                      }`,
                      `$data.${field.name}`,
                    ],
                  },
                },
              },
            },
          },
        },
      },
    ];
  } else {
    return [
      {
        $addFields: {
          [`data.${field.name}`]: {
            $let: {
              vars: {
                // We concat null at the end because if there is no value for a particular record
                // indexOfArray would return -1 and if we pass a negative index (-n for example) to $arrayElemAt
                // it would return the nth element starting from the last element of the array
                items: mappedItems.concat(null),
                itemsIds,
              },
              in: {
                $arrayElemAt: [
                  '$$items',
                  {
                    $indexOfArray: ['$$itemsIds', `$data.${field.name}`],
                  },
                ],
              },
            },
          },
        },
      },
    ];
  }
};

export default buildReferenceDataAggregation;
