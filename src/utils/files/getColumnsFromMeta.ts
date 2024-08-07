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
    if (field && field.name && typeof field.name === 'string') {
      // To get reference data fields
      const name = field.graphQLFieldName || field.name;
      const label =
        fields.find((data) => data.name === field.name)?.label || field.name;
      // Classic field
      columns.push({
        name: prefix ? `${prefix}.${name}` : name,
        field: prefix ? `${prefix}.${name}` : name,
        type: field.type,
        meta: {
          field,
        },
        label,
      });
    } else {
      const queryField = fields.find((x) => x.name === key);
      if (queryField && queryField.subFields) {
        // List of related objects
        const fullName = prefix ? `${prefix}.${key}` : key;
        columns.push({
          name: fullName,
          field: fullName,
          type: 'resources',
          subColumns:
            queryField.subFields.length > 0
              ? getColumnsFromMeta(field, queryField.subFields)
              : [],
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
