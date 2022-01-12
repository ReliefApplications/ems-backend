import { Workbook } from 'exceljs';
import get from 'lodash/get';

export default async (res, fileName: string, columns: any[], data) => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(fileName);

  const headerRow = worksheet.addRow(
    columns.flatMap((x) => (x.label ? x.label : x.name))
  );
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

  for (const row of data) {
    const temp = [];
    for (const column of columns) {
      temp.push(get(row, column.name, null));
    }
    worksheet.addRow(temp);
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + `${fileName}.xlsx`
  );

  // write to a new buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return res.send(buffer);
};
