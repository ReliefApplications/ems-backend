import { Workbook, stream } from 'exceljs';
import { Response } from 'express';
import get from 'lodash/get';
import { Cursor } from 'mongoose';
import i18next from 'i18next';
import { getRows } from './getRows';
import { AppAbility } from '@security/defineUserAbility';
import { getAccessibleFields } from '@utils/form';

/** Parameters for the fileBuilder */
type XlsxBuilderParams = {
  res: Response;
  fileName: string;
  columns: any[];
  query?: Cursor<any, any>;
  data?: any[];
  ability: AppAbility;
};

/**
 * Builds an XLSX file.
 *
 * @param params Parameters for the fileBuilder
 * @returns response with file attached.
 */
export default async (params: XlsxBuilderParams) => {
  const { res, fileName, columns, query, data, ability } = params;
  // Create a new instance of a Workbook class, if a query is provided, use a stream
  // Otherwise, use a buffer
  const workbook = query
    ? new stream.xlsx.WorkbookWriter({
        stream: res,
      })
    : new Workbook();
  const worksheet = workbook.addWorksheet(fileName);
  worksheet.properties.defaultColWidth = 15;

  let index = -1;
  const flatColumns = columns.reduce((acc, value) => {
    if (value.subColumns) {
      return acc.concat(
        value.subColumns.map((x) => {
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
        })
      );
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

  // Create header row, and style it
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
  headerRow.alignment = {
    horizontal: 'center',
  };

  // Merge headers
  const indexMap = flatColumns.reduce((acc, column) => {
    if (get(acc, column.field, null)) {
      acc[column.field].push(column.index);
    } else {
      Object.assign(acc, { [column.field]: [column.index] });
    }
    return acc;
  }, {});
  for (const column in indexMap) {
    if (indexMap[column].length > 1) {
      const leftCell = worksheet
        .getRow(1)
        .getCell(indexMap[column][0] + 1).address;
      const rightCell = worksheet
        .getRow(1)
        .getCell(indexMap[column][indexMap[column].length - 1] + 1).address;
      worksheet.mergeCells(`${leftCell}:${rightCell}`);
    }
  }

  // Create subheader row and style it
  const subHeaderColumns = flatColumns.map((x: any) => x.subTitle || '');
  if (subHeaderColumns.filter((x: string) => x).length > 0) {
    const subHeaderRow = worksheet.addRow(subHeaderColumns);
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
  }

  const addRow = (row: any) => {
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

    if (maxFieldLength > 0) {
      const subIndexes = flatColumns
        .filter((x) => x.subTitle)
        .map((x) => x.index);
      for (let i = 0; i < maxFieldLength; i++) {
        for (const field of flatColumns.filter((x: any) => x.subTitle)) {
          const value = get(row, field.field, []);
          if (value && value.length > 0) {
            temp[field.index] = get(
              get(row, field.field, null)[i],
              field.subField,
              null
            );
          } else {
            temp[field.index] = null;
          }
        }
        const newRow = worksheet.addRow(temp);
        if (i !== 0) {
          newRow.eachCell((cell, colNumber) => {
            if (!subIndexes.includes(colNumber - 1)) {
              cell.font = {
                color: { argb: 'FFFFFFFF' },
              };
            }
          });
          if (query) {
            newRow.commit();
          }
        }
      }
    } else {
      const newRow = worksheet.addRow(temp);
      if (query) {
        newRow.commit();
      }
    }
  };

  if (query) {
    query.on('data', (doc) => {
      const [row] = getRows(columns, [getAccessibleFields(doc, ability)]);
      addRow(row);
    });

    query.on('end', () => {
      (workbook as stream.xlsx.WorkbookWriter).commit().then(() => {
        return `${fileName}.xlsx`;
      });
    });

    query.on('error', (error) => {
      console.error(error);
      res.status(500).send(i18next.t('common.errors.internalServerError'));
    });
    return null;
  }

  // For each row, get the data for each column, then add the row
  data.forEach((row) => addRow(row));
  // write to a new buffer
  return workbook.xlsx.writeBuffer();
};
