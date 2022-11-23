import { isArray } from 'lodash';
import set from 'lodash/set';
import { PositionAttribute } from '@models';

/**
 * Transforms uploaded row into record data, using fiels definition.
 *
 * @param columns definition of structure columns.
 * @param row list of records
 * @returns list of export rows.
 */
export const loadRow = (
  columns: any[],
  row: any
): { data: any; positionAttributes: PositionAttribute[] } => {
  const data = {};
  const positionAttributes = [];
  for (const column of columns) {
    const value = row[column.index];
    if (value !== undefined) {
      switch (column.type) {
        case 'boolean': {
          let val: string | number | boolean;
          if (typeof value === 'object' && value !== null) {
            val = value.result;
          } else {
            val = value;
          }
          if (
            (typeof val === 'number' && val === 1) ||
            (typeof val === 'string' && val.toLowerCase() === 'true') ||
            (typeof val === 'boolean' && val)
          ) {
            data[column.field] = true;
          } else {
            data[column.field] = false;
          }
        }
        case 'checkbox': {
          if (value === 1) {
            data[column.field] = (
              isArray(data[column.field]) ? data[column.field] : []
            ).concat(column.value);
          }
          break;
        }
        case 'tagbox': {
          if (value === 1) {
            data[column.field] = (
              isArray(data[column.field]) ? data[column.field] : []
            ).concat(column.value);
          }
          break;
        }
        case 'multipletext': {
          set(data, `${column.field}.${column.item}`, value);
          break;
        }
        case 'matrix': {
          set(data, `${column.field}.${column.row}`, value);
          break;
        }
        case 'matrixdropdown': {
          set(data, `${column.field}.${column.row}.${column.column}`, value);
          break;
        }
        case '$attribute': {
          positionAttributes.push({
            value,
            category: column.category,
          });
          break;
        }
        default: {
          data[column.field] = value;
          break;
        }
      }
    }
  }
  return { data, positionAttributes };
};
