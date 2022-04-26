import { CustomAPI } from '../../../../server/apollo/dataSources';
import { ReferenceData } from '../../../../models';
import { Field } from '../../introspection/getFieldType';

/**
 * Return reference data meta field resolver.
 *
 * @param field field definition.
 * @returns Reference data meta resolver.
 */
const getMetaReferenceDataResolver =
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
      return referenceData.fields.reduce(
        (o, x) =>
          Object.assign(o, {
            [x]: {
              type: field.type,
              name: x,
              generated: true,
              choices: items.map((item) => ({
                value: item[x],
                text: item[x],
              })),
            },
          }),
        {}
      );
    }
    return null;
  };

export default getMetaReferenceDataResolver;
