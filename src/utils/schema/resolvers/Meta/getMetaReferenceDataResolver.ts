import { CustomAPI } from '@server/apollo/dataSources';
import { ReferenceData } from '@models';
import { Field } from '../../introspection/getFieldType';
import { referenceDataType } from '@const/enumTypes';
import get from 'lodash/get';

/**
 * Return reference data meta field resolver.
 *
 * @param field field definition.
 * @param referenceData Related reference data.
 * @returns Reference data meta resolver.
 */
const getMetaReferenceDataResolver =
  (field: Field, referenceData: ReferenceData) =>
  async (entity, args, context) => {
    const fieldMeta = get(entity, field.name, null);
    if (referenceData) {
      let items: any[];
      // If it's coming from an API Configuration, uses a dataSource.
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
      return referenceData.fields.reduce(
        (o, x) =>
          Object.assign(o, {
            [x]: {
              type: field.type,
              name: x,
              generated: true,
              choices: items.map((item) => ({
                value: String(item[x]),
                text: String(item[x]),
              })),
              permissions: get(fieldMeta, 'permissions', {
                canSee: false,
                canUpdate: false,
              }),
            },
          }),
        {}
      );
    }
    return null;
  };

export default getMetaReferenceDataResolver;
