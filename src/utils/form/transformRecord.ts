import { getDateForMongo } from '../filter/getDateForMongo';
import { getTimeForMongo } from '../filter/getTimeForMongo';

/**
 * Format passed value to comply with field definition.
 *
 * @param field field corresponding to the value
 * @param value value to format
 * @returns formatted value
 */
export const formatValue = (field: any, value: any): any => {
  switch (field.type) {
    case 'date':
    case 'datetime':
    case 'datetime-local':
      if (value != null) {
        return getDateForMongo(value).date;
      }
      break;
    case 'text':
      if (value != null) {
        if (Array.isArray(value)) {
          return value.toString();
        } else {
          return value;
        }
      }
      break;
    case 'time':
      if (value != null && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case 'time':
      if (value != null && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case 'file':
      if (value != null) {
        return value.map((x) => ({ name: x.name, content: x.content }));
      }
      break;
    default:
      return value;
  }
};

/**
 * Edit the value of a record's data to comply with definition of the fields of its form.
 *
 * @param record record to transform
 * @param fields definition of the forms
 * @returns record with edited field values
 */
export const transformRecord = (record: any, fields: any): Promise<any> => {
  for (const value in record) {
    if (Object.prototype.hasOwnProperty.call(record, value)) {
      const field = fields.find((x) => x.name === value);
      if (field) {
        record[value] = formatValue(field, record[value]);
      } else {
        delete record[value];
      }
    }
  }
  return record;
};
