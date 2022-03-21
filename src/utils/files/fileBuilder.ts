import csvBuilder from './csvBuilder';
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
export const fileBuilder = async (res, fileName: string, columns: any[], data, type: string): Promise<any> => {
  if (type === 'xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
