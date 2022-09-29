/**
 * Get list of columns from definition of structure fields and headers provided.
 *
 * @param fields definition of structure fields.
 * @param headers file headers.
 * @returns list of columns for upload analysis.
 */
export const getUploadColumns = (fields: any[], headers: any[]): any[] => {
  const columns = [];
  for (const field of fields) {
    switch (field.type) {
      case 'checkbox':
      case 'tagbox': {
        if (field.choices) {
          for (const item of field.choices) {
            const name = `${field.name}.${item.value}`;
            const index = headers.indexOf(name);
            if (index > 0) {
              columns.push({
                name,
                index,
                field: field.name,
                value: item.value,
                type: field.type,
              });
            }
          }
        } else {
          const name = `${field.name}`;
          const index = headers.indexOf(name);
          if (index > 0) {
            columns.push({
              name,
              index,
              field: field.name,
              type: field.type,
            });
          }
        }
        break;
      }
      case 'multipletext': {
        for (const item of field.items) {
          const name = `${field.name}.${item.name}`;
          const index = headers.indexOf(name);
          if (index > 0) {
            columns.push({
              name,
              index,
              field: field.name,
              item: item.name,
              type: field.type,
            });
          }
        }
        break;
      }
      case 'matrix': {
        for (const row of field.rows) {
          const name = `${field.name}.${row.name}`;
          const index = headers.indexOf(name);
          if (index > 0) {
            columns.push({
              name,
              index,
              field: field.name,
              row: row.name,
              type: field.type,
            });
          }
        }
        break;
      }
      case 'matrixdropdown': {
        for (const row of field.rows) {
          for (const column of field.columns) {
            const name = `${field.name}.${row.name}.${column.name}`;
            const index = headers.indexOf(name);
            if (index > 0) {
              columns.push({
                name,
                index,
                field: field.name,
                row: row.name,
                column: column.name,
                type: field.type,
              });
            }
          }
        }
        break;
      }
      case 'matrixdynamic': {
        for (const column of field.columns) {
          const name = `${field.name}.0.${column.name}`;
          const index = headers.indexOf(name);
          if (index > 0) {
            columns.push({
              name,
              index,
            });
          }
        }
        break;
      }
      default: {
        const name = `${field.name}`;
        const index = headers.indexOf(name);
        if (index > 0) {
          columns.push({
            name,
            index,
            field: field.name,
            type: field.type,
          });
        }
        break;
      }
    }
  }
  for (const name of headers.filter((x) => x && x.startsWith('$attribute.'))) {
    const index = headers.indexOf(name);
    columns.push({
      name,
      index,
      type: '$attribute',
      category: name.replace('$attribute.', ''),
    });
  }
  return columns;
};
