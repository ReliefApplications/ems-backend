import { isArray } from 'lodash';
import get from 'lodash/get';
import set from 'lodash/set';
import { getText } from '../form/getDisplayText';
import { Column } from './getColumnsFromMeta';

/**
 * Set a row for multiselect type, handle specific behavior with ReferenceData
 *
 * @param column Corresponding column.
 * @param data Data to set in row.
 * @param row Row to be updated.
 */
const setMultiselectRow = (column: any, data: any, row: any) => {
  if (column.value) {
    const value = data[column.field]?.includes(column.value) ? 1 : 0;
    set(row, column.name, value);
  } else {
    let value = get(data, column.field);
    // If it's a referenceData field, extract value differently.
    if (!column.meta.field.graphQLFieldName) {
      const choices = column.meta.field.choices || [];
      if (choices.length > 0) {
        if (Array.isArray(value)) {
          value = value.map((x) => getText(choices, x));
        } else {
          value = getText(choices, value);
        }
      }
    }
    set(row, column.name, Array.isArray(value) ? value.join(',') : value);
  }
};

/**
 * Transforms records into export rows, using fields definition.
 * Similar to the getRows method, but we do not have to care about default parameters there.
 *
 * @param columns definition of export columns.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRowsFromMeta = (columns: Column[], records: any[]): any[] => {
  const rows = [];
  for (const record of records) {
    const row = {};
    for (const column of columns) {
      switch (column.type) {
        case 'owner': {
          let value: any = get(record, column.field);
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
          let value: any = get(record, column.field);
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
        case 'checkbox':
        case 'tagbox': {
          setMultiselectRow(column, record, row);
          break;
        }
        case 'dropdown': {
          let value: any = get(record, column.field);
          // Only enter if not reference data
          if (!column.meta.field.graphQLFieldName) {
            const choices = column.meta.field.choices || [];
            if (choices.length > 0) {
              if (Array.isArray(value)) {
                value = value.map((x) => getText(choices, x));
              } else {
                value = getText(choices, value);
              }
            }
          }
          set(row, column.name, Array.isArray(value) ? value.join(',') : value);
          break;
        }
        case 'multipletext': {
          const value = get(record, column.name);
          set(row, column.name, value);
          break;
        }
        case 'matrix': {
          const value = get(record, column.name);
          set(row, column.name, value);
          break;
        }
        case 'matrixdropdown': {
          const value = get(record, column.name);
          set(row, column.name, value);
          break;
        }
        case 'resources': {
          const value = get(record, column.field) || [];
          if ((column.subColumns || []).length > 0) {
            if (value && isArray(value)) {
              const subRows = getRowsFromMeta(column.subColumns, value);
              set(row, column.name, subRows);
            }
          } else if (column.displayField) {
            const subRows = getRowsFromMeta([column.displayField], value);
            const separator = column.displayField.separator;
            set(
              row,
              column.name,
              subRows
                .map((subRow) => subRow[column.displayField.field])
                .filter(
                  (item) => item !== null && item !== undefined && item !== ''
                )
                .join(separator + ' ')
            );
          } else {
            if (value.length > 0) {
              set(
                row,
                column.name,
                `${value.length} item${value.length > 1 ? 's' : ''}`
              );
            } else {
              set(row, column.name, '');
            }
          }
          break;
        }
        case 'date': {
          const value = get(record, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[0]);
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case 'datetime':
        case 'datetime-local': {
          const value = get(record, column.field);
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
          const value = get(record, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[1].slice(0, 5));
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case 'file': {
          const value = get(record, `${column.field}.[0].name`);
          set(row, column.name, value);
          break;
        }
        default: {
          const value = get(record, column.field);
          if (column.subColumns) {
            if (value && isArray(value)) {
              const subRows = getRowsFromMeta(column.subColumns, value);
              set(row, column.name, subRows);
            }
          } else {
            set(row, column.name, value);
          }
          break;
        }
      }
    }
    rows.push(row);
  }
  return rows;
};
