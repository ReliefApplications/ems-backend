import { Workbook } from 'exceljs';
import get from 'lodash/get';
import record from 'schema/query/record';

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

  let index = -1;
  const flatColumns = columns.reduce((acc, value) => {
    if (value.subColumns) {
      return acc.concat(value.subColumns.map((x) => {
        index += 1;
        return {
          name: value.name,
          title: value.title || value.name,
          subName: x.name,
          subTitle: x.title || x.name,
          field: value.field,
          subField: x.field,
          index,
        };
      }));
    } else {
      index += 1;
      return acc.concat({
        name: value.name,
        title: value.title || value.name,
        field: value.field,
        index,
      });
    }
  }, []);

  const headerRow = worksheet.addRow(flatColumns.map((x: any) => x.title));
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

  const subHeaderRow = worksheet.addRow(flatColumns.map((x: any) => x.subTitle || ''));
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

  console.log(flatColumns.filter((x) => x.subTitle));
  for (const row of data) {
    const temp = [];
    let maxFieldLength = 0;
    for (const field of flatColumns) {
      if (field.subTitle) {
        const value = get(row, field.field, []);
        maxFieldLength = Math.max(maxFieldLength, value.length);
        temp.push('');
      } else {
        temp.push(get(row, field.field, null));
      }
    }
    worksheet.addRow(temp);
    
    if (maxFieldLength > 0) {
      const subIndexes = flatColumns.filter((x) => x.subTitle).map((x) => x.index);
      for (let i = 0; i < maxFieldLength; i++) {
        for (const field of flatColumns.filter((x) => x.subTitle)) {
          temp[field.index] = get(get(row, field.field, null)[i], field.subField, null);
        }
        const recordRow = worksheet.addRow(temp);
        if (i !== 0) {
          recordRow.font = {
            color: { argb: 'FFFFFFFF' },
          };
          recordRow.eachCell((cell, colNumber) => {
            if (subIndexes.includes(colNumber)) {
              cell.font = {
                color: { argb: '#000000' },
              };
            }
          });
        }
      }
    } else {
      worksheet.addRow(temp);
    }
  }
  // write to a new buffer
  return workbook.xlsx.writeBuffer();
};
