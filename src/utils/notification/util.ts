import { dateLocale, dateTimeLocale, timeLocale } from '@const/locale';
import {
  ApiConfiguration,
  EmailDistributionList,
  ReferenceData,
  Resource,
} from '@models';
import { DatasetPreviewArgs } from '@routes/notification';
import { buildDataSource, CustomAPI } from '@server/apollo/dataSources';
import { logger } from '@services/logger.service';
import Exporter from '@utils/files/resourceExporter';
import { Response } from 'express';
import { Request } from 'express-serve-static-core';
import { cloneDeep, map } from 'lodash';
import { mongo } from 'mongoose';
import * as EmailValidator from 'email-validator';

/**
 * Interface validate dataset count
 */
export interface ValidateDataset {
  name: string;
  records?: { [field: string]: unknown }[];
  columns?: {
    field: string;
    name: string;
    type: string;
  }[];
  individualEmail?: boolean;
  recordsCount?: number;
}

/**
 * Interface for a dataset with its records and columns.
 */
export interface ProcessedDataset {
  name: string;
  records: { [field: string]: unknown }[];
  columns: {
    subColumns?: [];
    field: string;
    name: string;
    type: string;
    label?: string;
  }[];
  individualEmail?: boolean;
  individualEmailRecords?: string[];
  email?: any;
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
 * Removes all whitespace characters from a given string.
 *
 * @param {string} input - The input string from which whitespace will be removed.
 * @returns {string} - The string with all whitespace characters removed.
 */
export const removeWhitespace = (input: string): string => {
  // Use a regular expression to replace all whitespace characters with an empty string
  return input.replace(/\s+/g, '');
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
      const subFields = field.fields;
      delete field.fields;
      flatFields.push({
        ...field,
        subColumns: getFlatFields(subFields),
      });
    }
  });

  return flatFields;
};

/**
 * Flattens the fields array, to also include the subfields of objects.
 *
 * @param fields Fields to flatten
 * @param path Current path to the field
 * @returns The flattened fields array
 */
export const getNestedFields = (fields: any, path = ''): any => {
  const flatFields: any = [];

  // Check if fields is an array
  if (!Array.isArray(fields)) {
    return flatFields; // Return an empty array if fields is not an array
  }

  fields.forEach((field: any) => {
    // Construct the full name for the field
    const fieldName = path + field.name;

    // Push the current field with the constructed name
    flatFields.push({
      ...field,
      name: fieldName,
    });

    // Recursively handle subfields for OBJECT and LIST kinds
    if (field.kind === 'OBJECT' || field.kind === 'LIST') {
      const subFields = field.fields || []; // Ensure subFields is an array
      flatFields.push(...getNestedFields(subFields, fieldName + '.'));
    }
  });

  return flatFields;
};

/**
 * Recursively flattens a nested object, converting nested keys into dot-separated strings
 * and filters the keys based on the provided columns.
 *
 * @param {Object} obj - The object to be flattened. This object can contain nested objects.
 * @param {Object[]} columnsObjects -  An array of column names (keys) that should be included in the flattened result.
 *                             If provided, only keys that match these columns will be included in the output.
 *                             If the array is empty, no filtering will be applied.
 * @param {string} [parentKey=''] - The base key to which nested keys will be appended. It starts as an empty string and accumulates key names during recursion to form dot-separated keys.
 * @param {Object} [result={}] - The resulting flattened object. This object accumulates key-value pairs where the keys are dot-separated strings representing the nested structure.
 * @returns {Object} - The flattened object with dot-separated keys.
 */
export const flattenObject = (
  obj,
  columnsObjects = [],
  parentKey = '',
  result = {}
) => {
  const columns = columnsObjects?.map((column) =>
    removeWhitespace(column.name?.toLowerCase())
  );
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        if (key === 'geospatial') {
          const countryName = obj[key]?.properties?.countryName;
          if (countryName) {
            result[key] = `${countryName}`;
          }
        } // Check for 'SCALAR' kind condition
        else if (
          columnsObjects.find((column) => column?.name === newKey.toLowerCase())
            ?.kind === 'SCALAR'
        ) {
          result[newKey] = obj[key];
        } else flattenObject(obj[key], columnsObjects, newKey, result);
      } else if (columns?.length) {
        if (columns.includes(newKey.toLowerCase())) result[newKey] = obj[key];
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

/**
 * Formats a given date into a specified string format.
 *
 * @param {Date|string|number} date - The date to format. Can be a Date object, a date string, or a timestamp.
 * @param {string} format - The format string containing tokens to replace with date parts.
 *                          Supported tokens:
 *                          - YYYY: Full year (e.g., 2024)
 *                          - YY: Last two digits of the year (e.g., 24)
 *                          - MM: Month (01-12)
 *                          - DD: Day of the month (01-31)
 *                          - HH: Hour in 12-hour format (01-12)
 *                          - mm: Minutes (00-59)
 *                          - ss: Seconds (00-59)
 *                          - A: AM or PM
 * @returns {string|null|undefined} - The formatted date string. If the date is invalid or not provided, returns null or undefined.
 */
export const formatDate = (date, format) => {
  if (date) {
    date = new Date(date);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString();
    const seconds = date.getSeconds().toString();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12; // Convert to 12-hour format
    const formattedHours = hours.toString();
    const shortYear = year.toString().slice(-2); // Get last two digits of the year

    const formatMap = {
      YYYY: year,
      YY: shortYear,
      MM: month,
      DD: day,
      HH: formattedHours,
      mm: minutes,
      ss: seconds,
      A: ampm,
    };

    return format.replace(
      /YYYY|YY|MM|DD|HH|mm|ss|A/g,
      (match) => formatMap[match]
    );
  }
  return date;
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
 * @param isValidate validate dataset records count
 */
export const fetchDatasets = async (
  datasets: DatasetPreviewArgs[],
  req: any,
  res: Response<any, Record<string, any>>,
  isValidate?: boolean
): Promise<ProcessedDataset[]> => {
  try {
    const processedDatasets = await Promise.all(
      datasets.map(async (dataset): Promise<any> => {
        if (dataset.resource) {
          const resource = await Resource.findById(dataset.resource).exec();
          if (!resource) throw new Error('common.errors.dataNotFound');

          const resourceExporter = new Exporter(req, res, resource, {
            query: dataset.query,
            timeZone: 'UTC',
            format: 'email',
            // Temp
            fields: getFlatFields(cloneDeep(dataset.query.fields)),
            filter: dataset.query.filter,
            limit: dataset.limit || Number.MAX_SAFE_INTEGER,
          });

          if (isValidate) {
            const records = await resourceExporter.getRecordsCount(true);
            const recordsCount = records?.[0]?.totalCount?.[0]?.count ?? 0;
            return {
              recordsCount,
              name: dataset.name,
            };
          } else {
            const records = await resourceExporter.export();
            return {
              ...records,
              name: dataset.name,
              individualEmail: dataset.individualEmail,
            };
          }
        }

        if (dataset.reference) {
          const reference = await ReferenceData.findById(
            dataset.reference
          ).exec();

          const apiConfiguration = await ApiConfiguration.findById(
            reference.apiConfiguration
          );

          const contextDataSource = (
            await buildDataSource(apiConfiguration.name, {
              req: req,
            } as any)
          )();

          const dataSource = contextDataSource[
            apiConfiguration.name
          ] as CustomAPI;
          const datasetFields = dataset.query.fields.map((field) => field.name);
          const data: any =
            (await dataSource.getReferenceDataItems(
              reference,
              apiConfiguration,
              dataset.query
            )) || [];

          if (isValidate) {
            const recordsCount = data.length ?? 0;
            return {
              recordsCount,
              name: dataset.name,
            };
          } else {
            //temporary fix to show first 50 records
            //once reference data filter implemented we'll remove this code
            let records = [];
            const DATASET_COUNT_LIMIT = 50;
            if (data.length <= DATASET_COUNT_LIMIT) {
              records = data;
            } else {
              records = data.slice(0, DATASET_COUNT_LIMIT);
            }
            // Remove all keys except those in datasetFields
            records = records.map((record) => {
              return Object.keys(record)
                .filter((key) => datasetFields.includes(key)) // Keep only the specified fields
                .reduce((obj, key) => {
                  obj[key] = record[key]; // Build a new object with the allowed keys
                  return obj;
                }, {});
            });
            return {
              columns: dataset.query.fields,
              records: records,
              name: dataset.name,
              individualEmail: dataset.individualEmail,
            };
          }
        }
      })
    );
    return processedDatasets.filter(Boolean);
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
    throw error;
  }
};

/**
 * Extracts emails from records into a set of unique emails for to|cc|bcc.
 *
 * @param obj Records to check
 * @param propertySet toEmails/ccEmails/bccEmails
 */
export const extractEmailsFromObject = (obj, propertySet) => {
  if (obj) {
    Object.values(obj).forEach((value) => {
      if (typeof value === 'string') {
        const validEmails = value?.split(',').map((email) => email.trim());
        validEmails.forEach((email) => {
          if (EmailValidator.validate(email)) {
            propertySet.add(email);
          }
        });
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') {
            const validEmails = item?.split(',').map((email) => email.trim());
            validEmails.forEach((email) => {
              if (EmailValidator.validate(email)) {
                propertySet.add(email);
              }
            });
          } else if (typeof item === 'object') {
            extractEmailsFromObject(item, propertySet);
          }
        });
      } else if (typeof value === 'object') {
        extractEmailsFromObject(value, propertySet);
      }
    });
  }
};

/**
 * Recursively traversing through objects or arrays
 *
 * @param data Record to extract emails from
 * @returns Array of flattened emails
 */
export const extractEmails = (data: any): string[] => {
  if (typeof data === 'string' && data.includes('@')) {
    return data.split(',').map((email) => email.trim());
  }

  if (Array.isArray(data)) {
    return data.flatMap(extractEmails);
  }

  if (typeof data === 'object' && data !== null) {
    return Object.values(data).flatMap(extractEmails);
  }

  return [];
};

/**
 * Given query descriptors and static emails, fetches and returns the complete distribution list
 *
 * @param emailDistributionList Distribution list id/object
 * @param req User request
 * @param res User reponse
 * @param subscriptionList List of emails that are subscribed to the notification
 */
export const fetchDistributionList = async (
  emailDistributionList: EmailDistributionList,
  req: Request<any, any>,
  res: Response<any, any>,
  subscriptionList?: string[]
): Promise<{ to: string[]; cc: string[]; bcc: string[]; name: string }> => {
  const toEmails = new Set<string>();
  const ccEmails = new Set<string>();
  const bccEmails = new Set<string>();
  if (emailDistributionList) {
    if (
      (emailDistributionList.to?.resource ||
        emailDistributionList.to?.reference) &&
      emailDistributionList.to?.query
    ) {
      const toQuery = {
        query: emailDistributionList.to.query,
        resource: emailDistributionList.to.resource,
        reference: emailDistributionList.to.reference,
      };
      const toRecords = (await fetchDatasets([toQuery], req, res))[0].records;
      toRecords.forEach((record) => {
        extractEmailsFromObject(record, toEmails);
      });
    }
    if (
      (emailDistributionList.cc?.resource ||
        emailDistributionList.cc?.reference) &&
      emailDistributionList.cc?.query
    ) {
      const ccQuery = {
        query: emailDistributionList.cc.query,
        resource: emailDistributionList.cc.resource,
        reference: emailDistributionList.cc.reference,
      };
      const ccRecords = (await fetchDatasets([ccQuery], req, res))[0].records;
      ccRecords.forEach((record) => {
        extractEmailsFromObject(record, ccEmails);
      });
    }
    if (
      (emailDistributionList.bcc?.resource ||
        emailDistributionList.bcc?.reference) &&
      emailDistributionList.bcc?.query
    ) {
      const bccQuery = {
        query: emailDistributionList.bcc.query,
        resource: emailDistributionList.bcc.resource,
        reference: emailDistributionList.bcc.reference,
      };
      const bccRecords = (await fetchDatasets([bccQuery], req, res))[0].records;
      bccRecords.forEach((record) => {
        extractEmailsFromObject(record, bccEmails);
      });
    }
    if (emailDistributionList.to?.inputEmails) {
      emailDistributionList.to.inputEmails.forEach((email) => {
        toEmails.add(email);
      });
    }
    if (subscriptionList) {
      subscriptionList.forEach((email) => {
        toEmails.add(email);
      });
    }
    if (emailDistributionList.cc?.inputEmails) {
      emailDistributionList.cc.inputEmails.forEach((email) => {
        ccEmails.add(email);
      });
    }
    if (emailDistributionList.bcc?.inputEmails) {
      emailDistributionList.bcc.inputEmails.forEach((email) => {
        bccEmails.add(email);
      });
    }
  }
  return {
    to: Array.from(toEmails),
    cc: Array.from(ccEmails),
    bcc: Array.from(bccEmails),
    name: emailDistributionList?.name || '',
  };
};
