/**
 * Remove null values from a record.
 *
 * @param record record to clean
 * @returns record without null values
 */
export const cleanRecord = (record: any): any => {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null)
  );
};
