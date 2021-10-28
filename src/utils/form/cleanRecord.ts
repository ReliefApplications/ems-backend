/**
 * Remove null values from a record.
 * @param record record to clean 
 * @returns record without null values
 */
export const cleanRecord = (record: any): any => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Object.fromEntries(Object.entries(record).filter(([_, v]) => v != null));
};
