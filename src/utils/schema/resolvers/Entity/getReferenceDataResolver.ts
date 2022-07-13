import { ReferenceData } from '../../../../models';
import { CustomAPI } from '../../../../server/apollo/dataSources';
import { Field } from '../../introspection/getFieldType';

/**
 * Return reference data field resolver.
 *
 * @param field field definition.
 * @returns Reference data resolver.
 */
const getReferenceDataResolver =
  (field: Field) => async (entity, args, context) => {
    const referenceData = await ReferenceData.findOne({
      _id: field.referenceData.id,
    }).populate({
      path: 'apiConfiguration',
      model: 'ApiConfiguration',
      select: { name: 1, endpoint: 1 },
    });
    if (referenceData) {
      const dataSource: CustomAPI =
        context.dataSources[(referenceData.apiConfiguration as any).name];
      const items = await dataSource.getReferenceDataItems(
        referenceData,
        referenceData.apiConfiguration as any
      );
      const item = items.find(
        (x) => x[referenceData.valueField] === entity.data[field.name]
      );
      return { ...item, id: item[referenceData.valueField] };
    }
    return null;
  };

export default getReferenceDataResolver;
