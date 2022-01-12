import { Workbook } from 'exceljs';

/**
 * Build an xlsx file showing the necessary columns name
 *
 * @param res Request response
 * @param fileName Name of the file
 * @param fields Array of objects containing a 'name' property describing the title of the column.
 *    The objects can contain a 'meta' property, which can describe the type of the field and other
 *    validation options
 * @returns The file included in res object
 */
export const templateBuilder = async (res, fileName: string, fields: any) => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(fileName);

  // === SET HEADERS ===
  const headerRow = worksheet.addRow(fields.map((x) => x.name));
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

  // === SET COLUMNS VALIDATORS ===
  fields.forEach((x: any, index: number) => {
    const meta = x.meta;
    if (meta) {
      switch (meta.type) {
        case 'list': {
          for (let i = 2; i <= 100; i++) {
            worksheet.getCell(i, index + 1).dataValidation = {
              type: 'list',
              formulae: [`"${meta.options.join(',')}"`],
              allowBlank: meta.allowBlank || true,
            };
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  });

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
