/**
 * Gets export columns from meta query
 *
 * @param meta meta data query
 * @param fields list of fields
 * @param prefix object prefix, used for getting nested properties
 * @returns List of columns for export.
 */
export const getColumnsFromMeta = (
  meta: any,
  fields: any[],
  prefix?: string
): any[] => {
  let columns = [];
  for (const key in meta) {
    const field = meta[key];
    if (field.name && typeof field.name === 'string') {
      // Classic field
      columns.push({
        name: prefix ? `${prefix}.${field.name}` : field.name,
        field: prefix ? `${prefix}.${field.name}` : field.name,
        type: field.type,
        meta: {
          field,
        },
      });
    } else {
      const queryField = fields.find((x) => x.name === key);
      if (queryField && queryField.subFields) {
        // List of related objects
        const fullName = prefix ? `${prefix}.${key}` : key;
        columns.push({
          name: fullName,
          field: fullName,
          subColumns: getColumnsFromMeta(field, queryField.subFields),
        });
      } else {
        // Single related object
        columns = columns.concat(
          getColumnsFromMeta(field, fields, prefix ? `${prefix}.${key}` : key)
        );
      }
    }
  }
  return columns;
};
