/**
 * Transforms uploaded row into record data, using fiels definition.
 * @param fields definition of structure fields.
 * @param row list of records
 * @returns list of export rows.
 */
export const loadRow = (fields: any[], row: any): any => {
    const data = {};
    fields.forEach((key, index) => {
        data[`${key}`] = row[index];
    });
    return data;
}
