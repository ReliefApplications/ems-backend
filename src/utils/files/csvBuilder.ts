import { Parser } from 'json2csv';
import get from 'lodash/get';

/**
 * Build a CSV file
 * @param res Request reponse
 * @param fileName Name of the file
 * @param columns Array of objects with a name property that will match the data,
 *      and optionally a label that will be the column title on the exported file
 * @param data Array of objects, that will be transformed into the rows of the csv.
 *      Each object should have [key, value] as [column's name, corresponding value].
 */
export default (res, fileName: string, columns: { name: string, label?: string }[], data) => {

  // Create a string array with the columns' labels or names as fallback, then construct the parser from it
  const columnsNames = columns.flatMap(x => x.label ? x.label : x.name);
  const json2csv = new Parser(columnsNames);

  const tempCsv = [];
  
  // Build an object for each row, and push it in an array  
  for (const row of data) {
    const temp = {};
    for (const column of columns) {
      const key = column.label || column.name;
      temp[key] = get(row, column.name, null);
    }
    tempCsv.push(temp);
  }

  // Generate the file by parsing the data, set the response parameters and send it
  const csv = json2csv.parse(tempCsv);
  res.header('Content-Type', 'text/csv');
  res.attachment(fileName);
  return res.send(csv);
};
