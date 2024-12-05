import { inputType, questionType } from '@services/form.service';
import get from 'lodash/get';
import set from 'lodash/set';
import { getText } from '../form/getDisplayText';

/**
 * Transforms records into export rows, using fields definition.
 *
 * @param columns definition of export columns.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRows = async (
  columns: any[],
  records: any[]
): Promise<any[]> => {
  const rows = [];
  for (const record of records) {
    const row = {};
    const data = record.data;
    for (const column of columns) {
      switch (column.type) {
        case questionType.CHECKBOX:
        case questionType.TAGBOX: {
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
        case questionType.DROPDOWN: {
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
        case questionType.MULTIPLE_TEXT:
        case questionType.MATRIX:
        case questionType.MATRIX_DROPDOWN: {
          const value = get(data, column.name);
          set(row, column.name, value);
          break;
        }
        case questionType.RESOURCES: {
          const value = get(data, column.field) || [];
          if (value.length > 0) {
            set(
              row,
              column.name,
              `${value.length} item${value.length > 1 ? 's' : ''}`
            );
          } else {
            set(row, column.name, '');
          }
          break;
        }
        case inputType.DATE: {
          const value = get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[0]);
          } else {
            set(row, column.name, value);
          }
          break;
        }
        case inputType.DATETIME:
        case inputType.DATETIME_LOCAL: {
          const value = column.default
            ? get(record, column.field)
            : get(data, column.field);
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
        case inputType.TIME: {
          const value = column.default
            ? get(record, column.field)
            : get(data, column.field);
          if (value) {
            const date = new Date(value);
            set(row, column.name, date.toISOString().split('T')[1].slice(0, 5));
          } else {
            set(row, column.name, value);
          }
          break;
        }
        default: {
          const value = column.default
            ? get(record, column.field)
            : get(data, column.field);
          set(row, column.name, value);
          break;
        }
      }
    }
    rows.push(row);
  }
  return rows;
};
