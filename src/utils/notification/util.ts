import { dateLocale, dateTimeLocale, timeLocale } from '@const/locale';
import { Resource } from '@models';
import { DatasetPreviewArgs } from '@routes/notification';
import { logger } from '@services/logger.service';
import Exporter from '@utils/files/resourceExporter';
import { Response } from 'express';
import { map } from 'lodash';
import { mongo } from 'mongoose';

/**
 *
 */
export interface ProcessedDataset {
  name: string;
  records: { [field: string]: unknown }[];
  columns: {
    field: string;
    name: string;
    type: string;
  }[];
  isIndividualEmail?: boolean;
}

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
 * Flattens the fields array, to also include the subfields of objects.
 *
 * @param fields Fields to flatten
 * @param path Current path to the field
 * @returns The flattened fields array
 */
export const getFlatFields = (fields: any, path = ''): any => {
  const flatFields: any = [];

  fields.forEach((field: any) => {
    flatFields.push({
      ...field,
      name: path + field.name,
    });

    // If an object, also include its subfields as data keys
    if (field.kind === 'OBJECT') {
      flatFields.push(...getFlatFields(field.fields, path + field.name + '.'));
    } else if (field.kind === 'LIST') {
      flatFields.push(
        ...getFlatFields(field.fields, path + field.name + '.[0].')
      );
    }
  });

  return flatFields;
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

/**
 * Fetch all datasets belonging to a particular email notification
 *
 * @param datasets Email Notification with records to fetch
 * @param req user request
 * @param res server response
 */
export const fetchDatasets = async (
  datasets: DatasetPreviewArgs[],
  req: any,
  res: Response<any, Record<string, any>>
): Promise<ProcessedDataset[]> => {
  try {
    const processedDatasets = await Promise.all(
      datasets.map(async (dataset): Promise<ProcessedDataset> => {
        const resource = await Resource.findById(dataset.resource).exec();
        if (!resource) throw new Error('common.errors.dataNotFound');

        const resourceExporter = new Exporter(req, res, resource, {
          query: dataset.query,
          timeZone: 'UTC',
          format: 'email',
          // Temp
          fields: getFlatFields(dataset.query.fields),
          filter: dataset.query.filter,
        });

        const records = await resourceExporter.export();
        return {
          ...records,
          name: dataset.name,
          individualEmail: dataset.individualEmail,
        };
      })
    );
    return processedDatasets;
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
    throw error;
  }
};
