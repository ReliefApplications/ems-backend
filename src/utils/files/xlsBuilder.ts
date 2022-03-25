import { Workbook } from 'exceljs';
import get from 'lodash/get';

/**
 * Builds an XLSX file.
 *
 * @param fileName Name of the file
 * @param columns Array of objects with a name property that will match the data, and optionally a label that will be the column title on the exported file
 * @param data Array of objects, that will be transformed into the rows of the csv. Each object should have [key, value] as [column's name, corresponding value].
 * @returns response with file attached.
 */
export default async (fileName: string, columns: any[], data) => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(fileName);

  const headerRow = worksheet.addRow(columns.map(x => x.title ? x.title : x.name));
  headerRow.font = {
    color: { argb: 'FFFFFFFF' },
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF008DC9' },
  };
  headerRow.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const subHeaderRow = worksheet.addRow([]);
  subHeaderRow.font = {
    color: { argb: 'FFFFFFFF' },
  };
  subHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF999999' },
  };
  subHeaderRow.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  for (const row of data) {
    const temp = [];
    for (const field of columns) {
      temp.push(get(row, field.field, null));
    }
    worksheet.addRow(temp);
  }
  // write to a new buffer
  return workbook.xlsx.writeBuffer();
};
