import { dateLocale, dateTimeLocale, timeLocale } from '@const/locale';
import { map } from 'lodash';
import { mongo } from 'mongoose';

/**
 * To replace all special characters with whitespace
 *
 * @param userValue The user's input value
 * @returns A string where all non-alphanumeric and non-hyphen characters are replaced with a whitespace.
 */
export const replaceUnderscores = (userValue: string): string => {
  return userValue ? userValue.replace(/[^a-zA-Z0-9-]/g, ' ') : '';
};

/**
 * Converts String to Title case
 *
 * @param str Input string to be converted
 * @returns Title case string
 */
export const titleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Replaces dates of type Date with pretty string representation
 *
 * @param rowData data going into table, from DB
 * @returns mutated date
 */
export const formatDates = (rowData: unknown): string => {
  if (typeof rowData === 'string') {
    return rowData;
  } else if (rowData instanceof Date) {
    // Format the date as MM/DD/YY, hh:mm AM/PM UTC
    return rowData.toLocaleString('en-US', dateTimeLocale);
  } else if (rowData === false) {
    return 'False';
  } else if (rowData === true) {
    return 'True';
  } else if (rowData instanceof mongo.ObjectId) {
    return rowData.toString();
  } else if (!rowData) {
    return '';
  } else if (rowData instanceof Array) {
    if (rowData[0] instanceof Object) {
      return map(rowData, 'text').join(', ');
    }
    return rowData.join(', ');
  } else if (rowData instanceof Object) {
    let objectString = '';
    for (const field in rowData) {
      objectString += `${field}: ${rowData[field]}\n`;
    }
    return objectString;
  }
  return JSON.stringify(rowData);
};

/**
 * Replaces datetime macros in email template with datetimes
 *
 * @param textElement Email template section with date macros to replace
 * @returns Mutated text element with datetime macros replaced
 */
export const replaceDateMacro = (textElement: string): string => {
  if (textElement) {
    if (textElement.includes('{{now.time}}')) {
      const nowToString = new Date().toLocaleTimeString('en-US', timeLocale);
      textElement = textElement.replace('{{now.time}}', nowToString);
    }
    if (textElement.includes('{{now.datetime}}')) {
      const nowToString = new Date().toLocaleString('en-US', dateTimeLocale);
      textElement = textElement.replace('{{now.datetime}}', nowToString);
    }
    if (textElement.includes('{{today.date}}')) {
      const todayToString = new Date().toLocaleDateString('en-US', dateLocale);
      textElement = textElement.replace('{{today.date}}', todayToString);
    }
  }

  return textElement;
};
