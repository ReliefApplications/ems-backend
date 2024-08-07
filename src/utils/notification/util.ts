import { dateLocale, dateTimeLocale, timeLocale } from '@const/locale';
import { EmailDistributionListQuery, Resource } from '@models';
import { DatasetPreviewArgs } from '@routes/notification';
import { logger } from '@services/logger.service';
import Exporter from '@utils/files/resourceExporter';
import { validateEmail } from '@utils/validators/validateEmail';
import { Response } from 'express';
import { Request } from 'express-serve-static-core';
import { map } from 'lodash';
import { mongo } from 'mongoose';

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
        if (!dataset.resource) {
          return;
        }
        const resource = await Resource.findById(dataset.resource).exec();
        if (!resource) throw new Error('common.errors.dataNotFound');

        const resourceExporter = new Exporter(req, res, resource, {
          query: dataset.query,
          timeZone: 'UTC',
          format: 'email',
          // Temp
          fields: getFlatFields(dataset.query.fields),
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
      })
    );
    return processedDatasets.filter(Boolean);
  } catch (error) {
    logger.error(error.message, { stack: error.stack });
    throw error;
  }
};

/**
 * Given query descriptors and static emails, fetches and returns the complete distribution list
 *
 * @param emailDistributionList Distribution list object containing to, cc, and bcc elements with their query and input emails
 * @param req User request
 * @param res User reponse
 */
export const fetchDistributionList = async (
  emailDistributionList: EmailDistributionListQuery,
  req: Request<any, any>,
  res: Response<any, any>
): Promise<{ to: string[]; cc: string[]; bcc: string[] }> => {
  const toEmails = new Set<string>();
  const ccEmails = new Set<string>();
  const bccEmails = new Set<string>();

  if (emailDistributionList.to?.resource && emailDistributionList.to?.query) {
    const toQuery = {
      query: emailDistributionList.to.query,
      resource: emailDistributionList.to.resource,
    };
    const toRecords = (await fetchDatasets([toQuery], req, res))[0].records;
    toRecords.forEach((record) => {
      Object.values(record).forEach((value) => {
        if (typeof value === 'string' && validateEmail(value)) {
          toEmails.add(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' && validateEmail(item)) {
              toEmails.add(item);
            }
          });
        }
      });
    });
  }
  if (emailDistributionList.cc?.resource && emailDistributionList.cc?.query) {
    const ccQuery = {
      query: emailDistributionList.cc.query,
      resource: emailDistributionList.cc.resource,
    };
    const ccRecords = (await fetchDatasets([ccQuery], req, res))[0].records;
    ccRecords.forEach((record) => {
      Object.values(record).forEach((value) => {
        if (typeof value === 'string' && validateEmail(value)) {
          ccEmails.add(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' && validateEmail(item)) {
              ccEmails.add(item);
            }
          });
        }
      });
    });
  }
  if (emailDistributionList.bcc?.resource && emailDistributionList.bcc?.query) {
    const bccQuery = {
      query: emailDistributionList.bcc.query,
      resource: emailDistributionList.bcc.resource,
    };
    const bccRecords = (await fetchDatasets([bccQuery], req, res))[0].records;
    bccRecords.forEach((record) => {
      Object.values(record).forEach((value) => {
        if (typeof value === 'string' && validateEmail(value)) {
          bccEmails.add(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' && validateEmail(item)) {
              bccEmails.add(item);
            }
          });
        }
      });
    });
  }
  if (emailDistributionList.to?.inputEmails) {
    emailDistributionList.to.inputEmails.forEach((email) => {
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
  return {
    to: Array.from(toEmails),
    cc: Array.from(ccEmails),
    bcc: Array.from(bccEmails),
  };
};
