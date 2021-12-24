import csvBuilder from './csvBuilder';
import xlsBuilder from './xlsBuilder';

/**
 * Build a csv | xls file from a list of records.
 * @param res Request response
 * @param fileName name of the file
 * @param columns list of the form columns
 * @param data records to put in the file
 * @param type xls | csv
 * @returns write a buffer and attach it to the response
 */
export const fileBuilder = (res, fileName: string, columns: any[], data, type: string): any => {
  if (type === 'xlsx') {
    return xlsBuilder(res, fileName, columns, data);
  } else {
    return csvBuilder(res, fileName, columns, data);
  }
};
