/**
 * Edit the value of a record to comply with definition of the fields of its form.
 *
 * @param record record to transform
 * @param fields definition of the forms
 * @returns record with edited field values
 */
export const transformRecord = async (
  record: any,
  fields: any
): Promise<any> => {
  for (const value in record) {
    if (Object.prototype.hasOwnProperty.call(record, value)) {
      const field = fields.find((x) => x.name === value);
      if (field) {
        switch (field.type) {
          case 'date':
            if (record[value] != null) {
              record[value] = new Date(record[value]);
            }
            break;
          case 'datetime':
            if (record[value] != null) {
              record[value] = new Date(record[value]);
            }
            break;
          case 'datetime-local':
            if (record[value] != null) {
              record[value] = new Date(record[value]);
            }
            break;
          case 'time':
            if (record[value] != null && !(record[value] instanceof Date)) {
              const hours = record[value].slice(0, 2);
              const minutes = record[value].slice(3);
              record[value] = new Date(Date.UTC(1970, 0, 1, hours, minutes));
            }
            break;
          case 'file':
            if (record[value] != null) {
              record[value].map((x) => (x = { name: x.name }));
            }
            break;
          default:
            break;
        }
      } else {
        delete record[value];
      }
    }
  }
  return record;
};
