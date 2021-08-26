import csvBuilder from './csvBuilder';
import xlsBuilder from './xlsBuilder';

/**
 * Build a csv | xls file from a list of records.
 * @param res response
 * @param fileName name of the file
 * @param fields list of the form fields
 * @param data records to put in the file
 * @param type xls | csv
 * @returns write a buffer and attach it to the response
 */
export const fileBuilder = (res, fileName: string, fields, data, type: string): any => {
    if (type === 'xlsx') {
        return xlsBuilder(res, fileName, fields, data);
    } else {
        return csvBuilder(res, fileName, fields, data);
    }
}
