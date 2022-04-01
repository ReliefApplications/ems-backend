import { Parser } from 'json2csv';
import get from 'lodash/get';

/**
 * Builds a CSV file.
 *
 * @param columns Array of objects with a name property that will match the data, and optionally a label that will be the column title on the exported file
 * @param data Array of objects, that will be transformed into the rows of the csv. Each object should have [key, value] as [column's name, corresponding value].
 * @returns response with file attached.
 */
export default (columns: any[], data) => {
  // Create a string array with the columns' labels or names as fallback, then construct the parser from it
  const fields = columns.flatMap((x) => ({ label: x.title, value: x.name }));
  const json2csv = new Parser({ fields });

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
};
