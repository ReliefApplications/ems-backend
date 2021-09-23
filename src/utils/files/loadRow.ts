import { isArray } from 'lodash';
import set from 'lodash/set';

/**
 * Transforms uploaded row into record data, using fiels definition.
 * @param columns definition of structure columns.
 * @param row list of records
 * @returns list of export rows.
 */
export const loadRow = (columns: any[], row: any): any => {
    const data = {};
    const positionAttributes = [];
    for (const column of columns) {
        const value = row[column.index];
        if (value) {
            switch (column.type) {
                case 'checkbox': {
                    if (value === 1) {
                        data[column.field] = (isArray(data[column.field]) ? data[column.field] : []).concat(column.value)
                    }
                    break;
                }
                case 'tagbox': {
                    if (value === 1) {
                        data[column.field] = (isArray(data[column.field]) ? data[column.field] : []).concat(column.value)
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
                    console.log('there')
                    positionAttributes.push({
                        value,
                        category: column.category
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
}
