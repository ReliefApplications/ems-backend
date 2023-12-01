import { AppAbility } from '@security/defineUserAbility';
import { Parser } from 'json2csv';
import get from 'lodash/get';
import { Cursor } from 'mongoose';
import { Response } from 'express';
import { getRows } from './getRows';
import { getAccessibleFields } from '@utils/form';
import i18next from 'i18next';
import { Readable } from 'stream';

/** Parameters for the csv file builder */
type CsvBuilderParams = {
  res?: Response;
  columns: any[];
  query?: Cursor<any, any>;
  data?: any[];
  ability: AppAbility;
};

/**
 * Builds a CSV file.
 *
 * @param params Parameters for the fileBuilder
 * @returns response with file attached.
 */
export default (params: CsvBuilderParams) => {
  const { res, columns, query, data, ability } = params;

  // Create a string array with the columns' labels or names as fallback, then construct the parser from it
  const fields = columns.flatMap((x) => ({ label: x.title, value: x.name }));
  const json2csv = new Parser({ fields });

  if (query) {
    // Create a readable stream from the Mongoose query stream
    const csvStream = new Readable();
    csvStream._read = () => {}; // Necessary for a readable stream

    // Transform each document to CSV and push it to the stream
    query.on('data', (doc) => {
      const [row] = getRows(columns, [getAccessibleFields(doc, ability)]);
      csvStream.push(json2csv.parse(row));
    });

    // When the query stream is finished, end the CSV stream
    query.on('end', () => {
      csvStream.push(null);
    });

    // Handle errors
    query.on('error', (error) => {
      console.error(error);
      res.status(500).send(i18next.t('common.errors.internalServerError'));
    });

    // Pipe the CSV stream to the response object
    csvStream.pipe(res);
  } else {
    const tempCsv = [];

    // Build an object for each row, and push it in an array
    for (const row of data) {
      const temp = {};
      for (const field of columns) {
        if (field.subColumns) {
          temp[field.name] = get(row, field.name, []).length;
        } else {
          temp[field.name] = get(row, field.name, null);
        }
      }
      tempCsv.push(temp);
    }
    // Generate the file by parsing the data, set the response parameters and send it
    const csv = json2csv.parse(tempCsv);
    return csv;
  }
};
