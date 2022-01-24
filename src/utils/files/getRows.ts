import get from 'lodash/get';
import set from 'lodash/set';
import { getText } from '../form/getDisplayText';

/**
 * Transforms records into export rows, using fields definition.
 * @param columns definition of export columns.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRows = async (columns: any[], records: any[]): Promise<any[]> => {
  const rows = [];
  for (const record of records) {
    const row = {};
    const data = record;
    for (const column of columns) {
      switch (column.type) {
        case 'checkbox': {
          if (column.value) {
            const value = data[column.field]?.includes(column.value) ? 1 : 0;
            set(row, column.field, value);
          } else {
            let value: any = get(data, column.field);
            const choices = column.meta.field.choices || [];
            if (choices.length > 0) {
              if (Array.isArray(value)) {
                value = value.map(x => getText(choices, x));
              } else {
                value = getText(choices, value);
              }
            }
            set(row, column.field, Array.isArray(value) ? value.join(',') : value);
          }
          break;
        }
        case 'tagbox': {
          if (column.value) {
            const value = data[column.field]?.includes(column.value) ? 1 : 0;
            set(row, column.field, value);
          } else {
            let value: any = get(data, column.field);
            const choices = column.meta.field.choices || [];
            if (choices.length > 0) {
              if (Array.isArray(value)) {
                value = value.map(x => getText(choices, x));
              } else {
                value = getText(choices, value);
              }
            }
            set(row, column.field, Array.isArray(value) ? value.join(',') : value);
          }
          break;
        }
        case 'dropdown': {
          let value: any = get(data, column.field);
          const choices = column.meta.field.choices || [];
          if (choices.length > 0) {
            if (Array.isArray(value)) {
              value = value.map(x => getText(choices, x));
            } else {
              value = getText(choices, value);
            }
          }
          set(row, column.field, Array.isArray(value) ? value.join(',') : value);
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
            set(row, column.field, `${value.length} items`);
          } else {
            set(row, column.field, '');
          }
          break;
        }
        case 'date': {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.field, date.toISOString().split('T')[0]);
          } else {
            set(row, column.field, value);
          }
          break;
        }
        case 'datetime': {
          const value = column.default ? get(record, column.field) : get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.field, `${date.toISOString().split('T')[0]} ${date.toISOString().split('T')[1].slice(0, 5)}`);
          } else {
            set(row, column.field, value);
          }
          break;
        }
        case 'datetime-local': {
          const value = column.default ? get(record, column.field) : get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.field, `${date.toISOString().split('T')[0]} ${date.toISOString().split('T')[1].slice(0, 5)}`);
          } else {
            set(row, column.field, value);
          }
          break;
        }
        case 'time': {
          const value = column.default ? get(record, column.field) : get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.field, date.toISOString().split('T')[1].slice(0, 5));
          } else {
            set(row, column.field, value);
          }
          break;
        }
        default: {
          const value = column.default ? get(record, column.field) : get(data, column.field);
          set(row, column.name, value);
          break;
        }
      }
    }
    rows.push(row);
  }
  return rows;
};
