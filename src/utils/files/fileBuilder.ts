import { RecordHistory, RecordHistoryMeta } from '@models';
import csvBuilder from './csvBuilder';
import historyBuilder from './historyBuilder';
import xlsBuilder from './xlsBuilder';

/**
 * Build a csv | xls file from a list of records.
 *
 * @param res Request response
 * @param fileName name of the file
 * @param columns list of the form columns
 * @param data records to put in the file
 * @param type xls | csv
 * @returns write a buffer and attach it to the response
 */
export const fileBuilder = async (
  res,
  fileName: string,
  columns: any[],
  data,
  type: string
): Promise<any> => {
  if (type === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
    const buffer = await xlsBuilder(fileName, columns, data);
    return res.send(buffer);
  } else {
    res.header('Content-Type', 'text/csv');
    res.attachment('records');
    return res.send(csvBuilder(columns, data));
  }
};

/**
 * Build a csv | xls file from a list of records.
 *
 * @param res Request response
 * @param history The record's history
 * @param meta The record's metadate
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
