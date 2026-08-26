import mongoose from 'mongoose';
import { getDateForMongo } from '../filter/getDateForMongo';
import { getTimeForMongo } from '../filter/getTimeForMongo';
import isNil from 'lodash/isNil';

type FieldDefinition = {
  name: string;
  type: string;
};

/**
 * Check whether a value is a canonical MongoDB ObjectId string.
 *
 * @param value candidate resource record identifier
 * @returns whether the value can safely be used as a resource record id
 */
export const isValidResourceId = (value: unknown): value is string =>
  typeof value === 'string' &&
  mongoose.isValidObjectId(value) &&
  new mongoose.Types.ObjectId(value).toString() === value;

/**
 * Get the resource field containing an invalid imported record identifier.
 *
 * @param record imported record data
 * @param fields form or resource field definitions
 * @returns invalid resource field name, if any
 */
export const getInvalidResourceField = (
  record: Record<string, unknown>,
  fields: FieldDefinition[]
): string | undefined =>
  fields.find(
    (field) =>
      field.type === 'resource' &&
      record[field.name] !== undefined &&
      record[field.name] !== null &&
      record[field.name] !== '' &&
      !isValidResourceId(record[field.name])
  )?.name;

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
      if (!isNil(value)) {
        return getDateForMongo(value).startDate;
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
    case 'time':
      if (!isNil(value) && !(value instanceof Date)) {
        return getTimeForMongo(value);
      }
      break;
    case 'file':
      if (!isNil(value)) {
        return value.map((x) => ({ name: x.name, content: x.content }));
      }
      break;
    case 'resource':
      if (!isNil(value)) {
        return isValidResourceId(value) ? value : null;
      }
      break;

    case 'resources':
      if (!isNil(value) && Array.isArray(value)) {
        //returns only valid ids from an array of ids
        return value.filter((resourceId) => isValidResourceId(resourceId));
      }
      break;
    case 'people-dropdown':
      if (!isNil(value)) {
        return value;
      }
      break;
    case 'people-tagbox':
      if (!isNil(value) && Array.isArray(value)) {
        return value;
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
