import { inputType, questionType } from '@services/form.service';
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
    case inputType.DATE:
    case inputType.DATETIME:
    case inputType.DATETIME_LOCAL:
      if (!isNil(value)) {
        return getDateForMongo(value).startDate;
      }
      break;
    case inputType.TEXT:
      if (!isNil(value)) {
        if (Array.isArray(value)) {
          return value.toString();
        } else {
          return value;
        }
      }
      break;
    case inputType.TIME:
      if (!isNil(value) && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case inputType.TIME:
      if (!isNil(value) && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case questionType.FILE:
      if (!isNil(value)) {
        return value.map((x) => ({ name: x.name, content: x.content }));
      }
      break;
    case questionType.RESOURCE:
      if (!isNil(value)) {
        //checks if the id is a valid mongo id
        return new mongoose.Types.ObjectId(value).toString() === value
          ? value
          : null;
      }
      break;

    case questionType.RESOURCES:
      if (!isNil(value) && Array.isArray(value)) {
        //returns only valid ids from an array of ids
        return value.filter(
          (resourceId) =>
            new mongoose.Types.ObjectId(resourceId).toString() === resourceId
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
