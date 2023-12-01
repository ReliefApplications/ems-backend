import { RecordHistory, RecordHistoryMeta } from '@models';
import csvBuilder from './csvBuilder';
import historyBuilder from './historyBuilder';
import xlsBuilder from './xlsBuilder';
import { Cursor } from 'mongoose';
import { Response } from 'express';
import { AppAbility } from '@security/defineUserAbility';

/** Parameters for the fileBuilder */
type FileBuilderParams = {
  res: Response;
  fileName: string;
  columns: any[];
  type: string;
  query?: Cursor<any, any>;
  data?: any[];
  ability: AppAbility;
};

/**
 * Build a csv | xls file from a list of records.
 *
 * @param params Parameters for the fileBuilder
 * @returns write a buffer and attach it to the response
 */
export const fileBuilder = async (params: FileBuilderParams): Promise<any> => {
  const { res, fileName, columns, type, query, data, ability } = params;

  if (type === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}.xlsx`
    );
    const buffer = await xlsBuilder({
      query,
      data,
      columns,
      ability,
      res,
      fileName,
    });

    // If xlsBuilder returns a buffer, send it
    if (buffer) {
      return res.send(buffer);
    }
  } else {
    res.header('Content-Type', 'text/csv');
    res.attachment('records');
    const file = csvBuilder({ res, columns, query, data, ability });

    // If csvBuilder returns a file, send it
    if (file) {
      return res.send(file);
    }
  }
};

/**
 * Build a csv | xls file from a list of records.
 *
 * @param res Request response
 * @param history The record's history
 * @param meta The record's metadata
 * @param options Options object
 * @param options.translate i18n translation function
 * @param options.dateLocale date formatting locale string
 * @param options.type xlsx | csv
 * @returns write a buffer and attach it to the response
 */
export const historyFileBuilder = async (
  res: any,
  history: RecordHistory,
  meta: RecordHistoryMeta,
  options: {
    translate: (key: string, options?: { [key: string]: string }) => string;
    dateLocale: string;
    type: 'csv' | 'xlsx';
  }
): Promise<any> => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
  const buffer = await historyBuilder(history, meta, options);
  return res.send(buffer);
};
