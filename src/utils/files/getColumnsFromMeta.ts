/**
 * Gets export columns from meta query
 * @param meta meta data query
 * @param prefix object prefix, used for getting nested properties
 * @returns List of columns for export.
 */
export const getColumnsFromMeta = (meta: any, prefix?: string): any[] => {
  let columns = [];
  for (const key in meta) {
    const field = meta[key];
    if (field.name && typeof(field.name) === 'string' ) {
      columns.push({
        name: prefix ? `${prefix}.${field.name}` : field.name,
        field: prefix ? `${prefix}.${field.name}` : field.name,
        type: field.type,
        meta: {
          field,
        },
      });
    } else {
      columns = columns.concat(getColumnsFromMeta(field, prefix ? `${prefix}.${key}` : key));
    }
  }
  return columns;
};
