import { referenceDataType } from '@const/enumTypes';
import { ReferenceData } from '@models';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { CustomAPI } from '../../server/apollo/dataSources';

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
  let items: any[];
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
  const itemsIds = items.map((item) => item[referenceData.valueField]);
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
                items,
              },
              in: {
                $filter: {
                  input: '$$items',
                  cond: {
                    $in: [
                      `$$this.${referenceData.valueField}`,
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
                items,
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
