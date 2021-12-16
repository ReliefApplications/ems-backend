import { Parser } from 'json2csv';
import get from 'lodash/get';

export default (res, fileName: string, columns: any[], data) => {

  const columnsNames = columns.flatMap(x => x.label ? x.label : x.name);
  const json2csv = new Parser(columnsNames);

  const tempCsv = [];
  for (const row of data) {
    const temp = {};
    for (const column of columns) {
      const key = column.label ? column.label : column.name;
      temp[key] = get(row, column.name, null);
    }
    tempCsv.push(temp);
  }
  const csv = json2csv.parse(tempCsv);
  res.header('Content-Type', 'text/csv');
  res.attachment(fileName);
  return res.send(csv);
};
