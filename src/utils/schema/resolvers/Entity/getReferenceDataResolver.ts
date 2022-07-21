import { ReferenceData } from '../../../../models';
import { CustomAPI } from '../../../../server/apollo/dataSources';
import { Field } from '../../introspection/getFieldType';
import { referenceDataType } from '../../../../const/enumTypes';
import { MULTISELECT_TYPES } from '../../../../const/fieldTypes';

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
      const res = items.reduce((arr, x) => {
        if (entity.data[field.name].includes(x[referenceData.valueField])) {
          arr.push({ ...x, id: x[referenceData.valueField] });
        }
        return arr;
      }, []);
      return res;
    }
    const item = items.find(
      (x) => x[referenceData.valueField] === entity.data[field.name]
    );
    return { ...item, id: item[referenceData.valueField] };
  };

export default getReferenceDataResolver;
