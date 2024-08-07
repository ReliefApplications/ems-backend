import mongoose from 'mongoose';
import { getDateForMongo } from '../filter/getDateForMongo';
import { getTimeForMongo } from '../filter/getTimeForMongo';
import isNil from 'lodash/isNil';

/**
 * Format passed value to comply with field definition.
 *
 * @param field field corresponding to the value
 * @param value value to format
 * @returns formatted value
 */
export const formatValue = (field: any, value: any): any => {
  switch (field.type) {
    // For the date, we don't want to store the time
    case 'date':
    case 'datetime':
    case 'datetime-local':
      if (!isNil(value)) {
        return getDateForMongo(value);
      }
      break;
    case 'text':
      if (!isNil(value)) {
        if (Array.isArray(value)) {
          return value.toString();
        } else {
          return value;
        }
      }
      break;
    case 'time':
      if (!isNil(value) && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case 'file':
      if (!isNil(value)) {
        return value.map((x) => ({
          name: x.name,
          content: x.content,
          includeToken: x.includeToken,
        }));
      }
      break;
    case 'resource':
      if (!isNil(value)) {
        //checks if the id is a valid mongo id
        return mongoose.isValidObjectId(value) ? value : null;
      }
      break;

    case 'resources':
      if (!isNil(value) && Array.isArray(value)) {
        //returns only valid ids from an array of ids
        return value.filter((resourceId) =>
          mongoose.isValidObjectId(resourceId)
        );
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
