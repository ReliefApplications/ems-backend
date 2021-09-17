/**
 * Transforms records into export rows, using fields definition.
 * @param fields definition of structure fields.
 * @param records list of records.
 * @returns list of export rows.
 */
export const getRows = (fields: any[], records: any[]): any[] => {
    return records.map(x => x.data);
}
