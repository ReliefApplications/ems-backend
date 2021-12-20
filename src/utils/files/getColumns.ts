import { getChoices } from '../proxy/getChoices';

const DEFAULT_FIELDS = ['id', 'createdAt', 'modifiedAt', 'incrementalId'];

/**
 * Transforms fields into export columns.
 * @param fields definition of structure fields.
 * @returns list of export columns.
 */
export const getColumns = async (fields: any[], token: string, template = false): Promise<any[]> => {
  const columns = [];
  for (const field of fields) {
    switch (field.type) {
      case 'checkbox': {
        if (field.choices && Array.isArray(field.choices) && template) {
          for (const item of field.choices) {
            const name = `${field.name}.${item.value}`;
            columns.push({
              name,
              label: field.label || name,
              field: field.name,
              value: item.value,
              type: field.type,
              meta: {
                type: 'list',
                allowBlank: true,
                options: [0, 1],
              },
            });
          }
        } else {
          if (field.choicesByUrl) {
            const choices = await getChoices(field, token);
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field: {
                  ...field,
                  choices,
                },
              },
            });
          } else {
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field,
              },
            });
          }
        }
        break;
      }
      case 'tagbox': {
        if (field.choices && Array.isArray(field.choices) && template) {
          for (const item of field.choices) {
            const name = `${field.name}.${item.value}`;
            columns.push({
              name,
              label: field.label || name,
              field: field.name,
              value: item.value,
              type: field.type,
              meta: {
                type: 'list',
                allowBlank: true,
                options: [0, 1],
              },
            });
          }
        } else {
          if (field.choicesByUrl) {
            const choices = await getChoices(field, token);
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field: {
                  ...field,
                  choices,
                },
              },
            });
          } else {
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field,
              },
            });
          }
        }
        break;
      }
      case 'multipletext': {
        for (const item of field.items) {
          const name = `${field.name}.${item.name}`;
          columns.push({
            name,
            label: field.label || name,
            field: field.name,
            item: item.name,
            type: field.type,
          });
        }
        break;
      }
      case 'matrix': {
        for (const row of field.rows) {
          const name = `${field.name}.${row.name}`;
          columns.push({
            name,
            label: field.label || name,
            field: field.name,
            row: row.name,
            type: field.type,
            meta: {
              type: 'list',
              allowBlank: true,
              options: field.columns.map(x => x.name),
            },
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
              label: field.label || name,
              field: field.name,
              row: row.name,
              column: column.name,
              type: field.type,
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
            label: field.label || name,
          });
        }
        break;
      }
      case 'dropdown': {
        const name = `${field.name}`;
        if (field.choices && Array.isArray(field.choices) && template) {
          columns.push({
            name,
            label: field.label || name,
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
          if (field.choicesByUrl) {
            const choices = await getChoices(field, token);
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field: {
                  ...field,
                  choices,
                },
              },
            });
          } else {
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field,
              },
            });
          }
        }
        break;
      }
      case 'radiogroup': {
        const name = `${field.name}`;
        if (field.choices && Array.isArray(field.choices) && template) {
          columns.push({
            name,
            label: field.label || name,
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
          if (field.choicesByUrl) {
            const choices = await getChoices(field, token);
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field: {
                  ...field,
                  choices,
                },
              },
            });
          } else {
            columns.push({
              name: field.name,
              label: field.label || field.name,
              field: field.name,
              type: field.type,
              meta: {
                field,
              },
            });
          }
        }
        break;
      }
      default: {
        const name = `${field.name}`;
        columns.push({
          name,
          label: field.label || name,
          field: field.name,
          type: field.type,
          default: DEFAULT_FIELDS.includes(field.name),
        });
        break;
      }
    }
  }
  return columns;
};
