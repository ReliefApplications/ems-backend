/**
 * Remove null values from a record.
 * @param record record to clean
 * @returns record without null values
 */
export const cleanRecord = (record: any): any => {
  return Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(record).filter(([_, v]) => v != null)
  );
};
