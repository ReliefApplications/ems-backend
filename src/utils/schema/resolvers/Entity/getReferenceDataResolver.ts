import { ReferenceData } from '@models';
import { CustomAPI } from '@server/apollo/dataSources';
import { Field } from '../../introspection/getFieldType';
import { referenceDataType } from '@const/enumTypes';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import get from 'lodash/get';
import { isArray, isEqual, isObject } from 'lodash';

/**
 * Return reference data field resolver.
 *
 * @param field field definition.
 * @param referenceData Related reference data.
 * @returns Reference data resolver.
 */
const getReferenceDataResolver =
  (field: Field, referenceData: ReferenceData) =>
  async (entity, args, context) => {
    let items: any[];
    const fieldValue = get(entity, `data.${field.name}`);
    // If it's already populated into the query
    if (
      isObject(fieldValue) &&
      (!isArray(fieldValue) ||
        fieldValue.length === 0 ||
        isObject(fieldValue[0]))
    ) {
      return fieldValue;
    }
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
    if (MULTISELECT_TYPES.includes(field.type)) {
      // tagbox / checkboxes
      if (fieldValue) {
        const res = items.reduce((arr, x) => {
          if (fieldValue.includes(get(x, referenceData.valueField, ''))) {
            arr.push({ ...x, id: get(x, referenceData.valueField, '') });
          }
          return arr;
        }, []);
        return res;
      } else {
        return [];
      }
    } else {
      // dropdown / radiogroup
      if (fieldValue) {
        const item = items.find((x) =>
          isEqual(get(x, referenceData.valueField, ''), fieldValue)
        );
        return item
          ? { ...item, id: get(item, referenceData.valueField, '') }
          : null;
      } else {
        return null;
      }
    }
  };

export default getReferenceDataResolver;
