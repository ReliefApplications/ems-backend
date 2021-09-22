/**
 * Transforms uploaded row into record data, using fiels definition.
 * @param fields definition of structure fields.
 * @param row list of records
 * @returns list of export rows.
 */
export const loadRow = (fields: any[], row: any): any => {
    console.log(row);
    const data = {};
    for (const field of fields) {
        const key = field.name;
        data[`${key}`] = row[field.index]
    }
    return data;
}
