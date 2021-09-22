import get from 'lodash/get';
import set from 'lodash/set';
/**
 * Transforms records into export rows, using fields definition.
 * @param columns definition of export columns.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRows = (columns: any[], records: any[]): any[] => {
    const rows = [];
    for (const record of records) {
        const row = {};
        const data = record.data;
        for (const column of columns) {
            switch (column.type) {
                case 'checkbox': {
                    const value = data[column.field]?.includes(column.value) ? 1 : 0;
                    set(row, column.name, value);
                    break;
                }
                case 'tagbox': {
                    const value = data[column.field]?.includes(column.value) ? 1 : 0;
                    set(row, column.name, value);
                    break;
                }
                case 'multipletext': {
                    console.log('okokok')
                    console.log(column.field);
                    console.log(column.name);
                    console.log(data[column.name]);
                    const value = get(data, column.name);
                    console.log(value)
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
                default: {
                    const value = data[column.field];
                    set(row, column.name, value);
                    break;
                }
            }
        }
        rows.push(row);
    }
    return rows;
}
