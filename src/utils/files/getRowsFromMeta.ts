import get from 'lodash/get';
import set from 'lodash/set';
import { getText } from '../form/getDisplayText';

/**
 * Transforms records into export rows, using fields definition.
 * Similar to the getRows method, but we do not have to care about default parameters there.
 *
 * @param columns definition of export columns.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRowsFromMeta = async (
  columns: any[],
  records: any[]
): Promise<any[]> => {
  const rows = [];
  for (const data of records) {
    const row = {};
    for (const column of columns) {
      switch (column.type) {
        case 'owner': {
          let value: any = get(data, column.field);
          const choices = column.meta.field.choices || [];
          if (choices.length > 0) {
            if (Array.isArray(value)) {
              value = value.map((x) => getText(choices, x));
            } else {
              value = getText(choices, value);
            }
          }
          set(row, column.name, Array.isArray(value) ? value.join(',') : value);
          break;
        }
        case 'users': {
          let value: any = get(data, column.field);
          const choices = column.meta.field.choices || [];
          if (choices.length > 0) {
            if (Array.isArray(value)) {
              value = value.map((x) => getText(choices, x));
            } else {
              value = getText(choices, value);
            }
          }
          set(row, column.name, Array.isArray(value) ? value.join(',') : value);
          break;
        }
        case 'checkbox': {
          if (column.value) {
            const value = data[column.field]?.includes(column.value) ? 1 : 0;
            set(row, column.name, value);
          } else {
            let value: any = get(data, column.field);
            const choices = column.meta.field.choices || [];
            if (choices.length > 0) {
              if (Array.isArray(value)) {
                value = value.map((x) => getText(choices, x));
              } else {
                value = getText(choices, value);
              }
            }
            set(
              row,
              column.name,
              Array.isArray(value) ? value.join(',') : value
            );
          }
          break;
        }
        case 'tagbox': {
          if (column.value) {
            const value = data[column.field]?.includes(column.value) ? 1 : 0;
            set(row, column.name, value);
          } else {
            let value: any = get(data, column.field);
            const choices = column.meta.field.choices || [];
            if (choices.length > 0) {
              if (Array.isArray(value)) {
                value = value.map((x) => getText(choices, x));
              } else {
                value = getText(choices, value);
              }
            }
            set(
              row,
              column.name,
              Array.isArray(value) ? value.join(',') : value
            );
          }
          break;
        }
        case 'dropdown': {
          let value: any = get(data, column.field);
          const choices = column.meta.field.choices || [];
          if (choices.length > 0) {
            if (Array.isArray(value)) {
              value = value.map((x) => getText(choices, x));
            } else {
              value = getText(choices, value);
            }
          }
          set(row, column.name, Array.isArray(value) ? value.join(',') : value);
          break;
        }
        case 'multipletext': {
          const value = get(data, column.name);
          set(row, column.name, value);
          break;
        }
        case 'matrix': {
          const value = get(data, column.name);
          set(row, column.name, value);
          break;
        }
        case 'matrixdropdown': {
          const value = get(data, column.name);
          set(row, column.name, value);
          break;
        }
        case 'resources': {
          const value = get(data, column.field) || [];
          if (value.length > 0) {
            set(row, column.name, `${value.length} items`);
          } else {
            set(row, column.name, '');
          }
          break;
        }
        case 'date': {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[0]);
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case 'datetime': {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(
              row,
              column.name,
              `${date.toISOString().split('T')[0]} ${date
                .toISOString()
                .split('T')[1]
                .slice(0, 5)}`
            );
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case 'datetime-local': {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(
              row,
              column.name,
              `${date.toISOString().split('T')[0]} ${date
                .toISOString()
                .split('T')[1]
                .slice(0, 5)}`
            );
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case 'time': {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[1].slice(0, 5));
          } else {
            set(row, column.name, value);
          }
          break;
        }
        default: {
          const value = get(data, column.field);
          set(row, column.name, value);
          break;
        }
      }
    }
    rows.push(row);
  }
  return rows;
};
