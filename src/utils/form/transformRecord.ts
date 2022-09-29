import { getDateForMongo } from '../filter/getDateForMongo';
import { getTimeForMongo } from '../filter/getTimeForMongo';

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
          case 'datetime':
          case 'datetime-local':
            if (record[value] != null) {
              record[value] = getDateForMongo(record[value]).date;
              console.log('record[value]', record[value]);
            }
            break;
          case 'time':
            if (record[value] != null && !(record[value] instanceof Date)) {
              record[value] = getTimeForMongo(record[value]);
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
