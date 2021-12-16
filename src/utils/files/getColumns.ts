const DEFAULT_FIELDS = ['id', 'createdAt', 'incrementalId'];

/**
 * Transforms fields into export columns.
 * @param fields definition of structure fields.
 * @returns list of export columns.
 */
export const getColumns = (fields: any[]): any[] => {
  const columns = [];
  for (const field of fields) {
    switch (field.type) {
      case 'checkbox': {
        if (field.choices && Array.isArray(field.choices)) {
          for (const item of field.choices) {
            const name = `${field.name}.${item.value}`;
            columns.push({
              name,
              field: field.name,
              value: item.value,
              type: field.type,
              meta: {
                type: 'list',
                allowBlank: true,
                options: [0, 1],
              },
              ...(field.label && { label: field.label }),
            });
          }
        } else {
          const name = field.name;
          columns.push({
            name,
            field: field.name,
            type: field.type,
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      case 'tagbox': {
        if (field.choices && Array.isArray(field.choices)) {
          for (const item of field.choices) {
            const name = `${field.name}.${item.value}`;
            columns.push({
              name,
              field: field.name,
              value: item.value,
              type: field.type,
              meta: {
                type: 'list',
                allowBlank: true,
                options: [0, 1],
              },
              ...(field.label && { label: field.label }),
            });
          }
        } else {
          const name = field.name;
          columns.push({
            name,
            field: field.name,
            type: field.type,
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      case 'multipletext': {
        for (const item of field.items) {
          const name = `${field.name}.${item.name}`;
          columns.push({
            name,
            field: field.name,
            item: item.name,
            type: field.type,
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      case 'matrix': {
        for (const row of field.rows) {
          const name = `${field.name}.${row.name}`;
          columns.push({
            name,
            field: field.name,
            row: row.name,
            type: field.type,
            meta: {
              type: 'list',
              allowBlank: true,
              options: field.columns.map(x => x.name),
            },
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      case 'matrixdropdown': {
        for (const row of field.rows) {
          for (const column of field.columns) {
            const name = `${field.name}.${row.name}.${column.name}`;
            columns.push({
              name,
              field: field.name,
              row: row.name,
              column: column.name,
              type: field.type,
              ...(field.label && { label: field.label }),
            });
          }
        }
        break;
      }
      case 'matrixdynamic': {
        for (const column of field.columns) {
          const name = `${field.name}.0.${column.name}`;
          columns.push({
            name,
          });
        }
        break;
      }
      case 'dropdown': {
        const name = `${field.name}`;
        if (field.choices && Array.isArray(field.choices)) {
          columns.push({
            name,
            field: field.name,
            type: field.type,
            meta: {
              type: 'list',
              allowBlank: true,
              options: field.choices.map(x => x.value),
            },
            ...(field.label && { label: field.label }),
          });
        } else {
          columns.push({
            name,
            field: field.name,
            type: field.type,
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      case 'radiogroup': {
        const name = `${field.name}`;
        if (field.choices && Array.isArray(field.choices)) {
          columns.push({
            name,
            field: field.name,
            type: field.type,
            meta: {
              type: 'list',
              allowBlank: true,
              options: field.choices.map(x => x.value),
            },
            ...(field.label && { label: field.label }),
          });
        } else {
          columns.push({
            name,
            field: field.name,
            type: field.type,
            ...(field.label && { label: field.label }),
          });
        }
        break;
      }
      default: {
        const name = `${field.name}`;
        columns.push({
          name,
          field: field.name,
          type: field.type,
          default: DEFAULT_FIELDS.includes(field.name),
          ...(field.label && { label: field.label }),
        });
        break;
      }
    }
  }
  return columns;
};
