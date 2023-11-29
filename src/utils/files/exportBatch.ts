import { buildMetaQuery } from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet } from 'exceljs';
import get from 'lodash/get';
import { getColumnsFromMeta } from './getColumnsFromMeta';
import { getRowsFromMeta } from './getRowsFromMeta';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { Parser } from 'json2csv';
import { Record } from '@models';
import mongoose from 'mongoose';
import { defaultRecordFields } from '@const/defaultRecordFields';
import getFilter from '@utils/schema/resolvers/Query/getFilter';

/**
 * Export batch parameters interface
 */
interface ExportBatchParams {
  ids?: string[];
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  resource?: string;
}

/**
 * Set headers of file
 *
 * @param worksheet worksheet to apply headers on
 * @param columns columns to set as headers
 */
const setHeaders = (worksheet: Worksheet, columns: any[]) => {
  // Create header row, and style it
  const headerRow = worksheet.addRow(columns.map((x: any) => x.title));
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
  const indexMap = columns.reduce((acc, column) => {
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
  const subHeaderColumns = columns.map((x: any) => x.subTitle || '');
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
};

/**
 * Get flat columns from raw columns
 *
 * @param columns raw columns
 * @returns flat columns
 */
const getFlatColumns = (columns: any[]) => {
  let index = -1;
  return columns.reduce((acc, value) => {
    if (value.subColumns) {
      // Create nested headers
      if (value.subColumns.length > 0) {
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
        // Create a single column as we see in the grid
        index += 1;
        return acc.concat({
          name: value.name,
          title: value.title || value.name,
          field: value.field,
          index,
        });
      }
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
};

/**
 * Get columns from parameters
 *
 * @param req current request
 * @param params export batch parameters
 * @returns columns as promise
 */
const getColumns = (req: any, params: ExportBatchParams): Promise<any[]> => {
  const metaQuery = buildMetaQuery(params.query);
  return new Promise((resolve) => {
    axios({
      url: `${config.get('server.url')}/graphql`,
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json',
      },
      data: {
        query: metaQuery,
      },
    }).then(({ data }) => {
      for (const field in data.data) {
        if (Object.prototype.hasOwnProperty.call(data.data, field)) {
          const meta = data.data[field];
          const rawColumns = getColumnsFromMeta(meta, params.fields);
          const columns = rawColumns.filter((x) =>
            params.fields.find((f) => f.name === x.name)
          );
          // Edits the column to match with the fields
          columns.forEach((column) => {
            const queryField = params.fields.find(
              (f) => f.name === column.name
            );
            column.title = queryField.title;
            if (column.subColumns) {
              if ((queryField.subFields || []).length > 0) {
                column.subColumns.forEach((f) => {
                  const subQueryField = queryField.subFields.find(
                    (z) => z.name === `${column.name}.${f.name}`
                  );
                  f.title = subQueryField.title;
                });
              }
            }
          });
          resolve(columns);
        }
      }
    });
  });
};

/**
 * Write rows in xlsx format
 *
 * @param worksheet worksheet to write on
 * @param columns columns to use
 * @param records records to write as rows
 */
const writeRowsXlsx = (
  worksheet: Worksheet,
  columns: any[],
  records: any[]
) => {
  records.forEach((record) => {
    const temp = [];
    let maxFieldLength = 0;
    for (const field of columns) {
      if (field.subTitle) {
        const value = get(record, field.field, []);
        maxFieldLength = Math.max(maxFieldLength, value.length);
        temp.push('');
      } else {
        temp.push(get(record, field.field, null));
      }
    }

    if (maxFieldLength > 0) {
      const subIndexes = columns.filter((x) => x.subTitle).map((x) => x.index);
      for (let i = 0; i < maxFieldLength; i++) {
        for (const field of columns.filter((x: any) => x.subTitle)) {
          const value = get(record, field.field, []);
          if (value && value.length > 0) {
            temp[field.index] = get(
              get(record, field.field, null)[i],
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
        }
      }
    } else {
      worksheet.addRow(temp);
    }
  });
};

/**
 * Get rows for xlsx
 *
 * @param params export batch params
 * @param worksheet worksheet to write on
 * @param columns columns to use
 */
const getRowsXlsx = async (
  params: ExportBatchParams,
  worksheet: Worksheet,
  columns: any[]
) => {
  try {
    let records: Record[] = [];
    if (params.ids.length > 0) {
      records = await Record.find({
        _id: {
          $in: params.ids.map((id: string) => new mongoose.Types.ObjectId(id)),
        },
      });
    } else {
      records = await Record.aggregate([
        {
          $match: {
            $and: [
              { resource: new mongoose.Types.ObjectId(params.resource) },
              getFilter(params.filter, columns),
            ],
          },
        },
        {
          $project: {
            _id: 0,
            ...columns.reduce((acc, col) => {
              if (
                defaultRecordFields.some((field) => field.field === col.field)
              ) {
                acc[col.field] = `$${col.field}`;
              } else {
                acc[col.field] = `$data.${col.field}`;
              }
              return acc;
            }, {}),
          },
        },
        {
          $sort: {
            [params.sortField]: params.sortOrder === 'asc' ? 1 : -1,
          },
        },
      ]);
    }
    console.log(records[0], JSON.stringify(columns));
    writeRowsXlsx(
      worksheet,
      getFlatColumns(columns),
      getRowsFromMeta(columns, records)
    );
  } catch (err) {
    logger.error(err.message);
  }
};

/**
 * Get rows for csv
 *
 * @param params export batch parameters
 * @param parser csv parser
 * @param columns columns to use
 * @returns csv
 */
const getRowsCsv = async (
  params: ExportBatchParams,
  parser: Parser,
  columns: any[]
) => {
  const csvData = [];
  try {
    let records: Record[] = [];
    if (params.ids.length > 0) {
      records = await Record.find({
        _id: {
          $in: params.ids.map((id: string) => new mongoose.Types.ObjectId(id)),
        },
      });
    } else {
      records = await Record.aggregate([
        {
          $match: {
            $and: [
              { resource: new mongoose.Types.ObjectId(params.resource) },
              getFilter(params.filter, columns),
            ],
          },
        },
        {
          $project: {
            _id: 0,
            ...columns.reduce((acc, col) => {
              if (
                defaultRecordFields.some((field) => field.field === col.field)
              ) {
                acc[col.field] = `$${col.field}`;
              } else {
                acc[col.field] = `$data.${col.field}`;
              }
              return acc;
            }, {}),
          },
        },
        {
          $sort: {
            [params.sortField]: params.sortOrder === 'asc' ? 1 : -1,
          },
        },
      ]);
    }
    console.log(records[0]);
    for (const row of records) {
      const temp = {};
      for (const column of columns) {
        if (column.subColumns) {
          temp[column.name] = (get(row, column.name) || []).length;
        } else {
          temp[column.name] = get(row, column.name, null);
        }
      }
      csvData.push(temp);
    }
  } catch (err) {
    logger.error(err.message);
  }
  // Generate the file by parsing the data, set the response parameters and send it
  const csv = parser.parse(csvData);
  return csv;
};

/**
 * Write a buffer from request, to export records as xlsx or csv
 *
 * @param req current request
 * @param params export batch parameters
 * @returns xlsx or csv buffer
 */
export default async (req: any, params: ExportBatchParams) => {
  // Get total count and columns
  let start = Date.now();
  const columns = await getColumns(req, params);
  console.log('col took ', Date.now() - start);
  start = Date.now();
  switch (params.format) {
    case 'xlsx': {
      // Create file
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('records');
      worksheet.properties.defaultColWidth = 15;
      console.log('bullshit took ', Date.now() - start);
      start = Date.now();
      // Set headers of the file
      setHeaders(worksheet, getFlatColumns(columns));
      console.log('set headers took ', Date.now() - start);
      start = Date.now();
      // Write rows
      await getRowsXlsx(params, worksheet, columns);
      console.log('getting rows took ', Date.now() - start);
      console.log(Date.now());
      return workbook.xlsx.writeBuffer();
    }
    case 'csv': {
      // Create a string array with the columns' labels or names as fallback, then construct the parser from it
      const fields = columns.flatMap((x) => ({
        label: x.title,
        value: x.name,
      }));
      const json2csv = new Parser({ fields });
      // Generate csv, by parsing the data
      const csv = await getRowsCsv(params, json2csv, columns);
      return csv;
    }
  }
};
