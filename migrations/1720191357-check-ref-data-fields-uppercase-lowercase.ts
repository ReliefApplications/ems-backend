import { Resource } from '@models';
import { startDatabaseForMigration } from '@utils/migrations/database.helper';

/**
 * Because of the recent update of the reference data fields name, check for layouts
 * and aggregations ths used these fields and need to be updated ad well.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find().select('layouts aggregations fields');

  for (const resource of resources) {
    const fields = resource.fields;
    const refDataFields = [];
    // Find reference data fields
    fields.forEach((field: any) => {
      if (field.referenceData) {
        refDataFields.push(field);
      }
    });
    if (refDataFields.length) {
      let updatedLayouts = false;
      let updatedAggregations = false;
      // Check layouts
      for (const layout of resource.layouts) {
        // Check if layout use any of the refDataFields
        for (const refDataField of refDataFields) {
          const fieldIndex = layout.query.fields.findIndex(
            (field: any) =>
              field.name.toLowerCase() === refDataField.name.toLowerCase()
          );
          if (fieldIndex !== -1) {
            // Rename the field in the layout query fields
            layout.query.fields[fieldIndex] = {
              ...layout.query.fields[fieldIndex],
              fields: layout.query.fields[fieldIndex].fields.map(
                (field: any) => {
                  if (
                    refDataField.name.toLowerCase() === field.name.toLowerCase()
                  ) {
                    return {
                      ...field,
                      name: refDataField.name,
                    };
                  } else {
                    return field;
                  }
                }
              ),
            };
            updatedLayouts = true;
            break;
          }
        }
      }
      for (const aggregation of resource.aggregations) {
        for (const refDataField of refDataFields) {
          const fieldIndex = aggregation.sourceFields.findIndex(
            (field: any) =>
              field.toLowerCase() === refDataField.name.toLowerCase()
          );
          if (fieldIndex !== -1) {
            aggregation.sourceFields[fieldIndex] = refDataField.name;
            updatedAggregations = true;
            break;
          }
        }
      }

      if (updatedLayouts) {
        // Necessary because mongoose can't detect the modifications in the nested property layouts
        resource.markModified('layouts');
      }
      if (updatedAggregations) {
        // Necessary because mongoose can't detect the modifications in the nested property aggregations
        resource.markModified('aggregations');
      }
      if (updatedAggregations || updatedLayouts) {
        await resource.save();
      }
    }
  }
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
