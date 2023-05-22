import {
  buildMetaQuery,
  buildQuery,
  buildTotalCountQuery,
} from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet } from 'exceljs';
import get from 'lodash/get';
import { getColumnsFromMeta } from './getColumnsFromMeta';
import { getRowsFromMeta } from './getRowsFromMeta';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { Parser } from 'json2csv';

interface exportBatchParams {
  ids?: string[];
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

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

const getTotalCount = (
  req: any,
  params: exportBatchParams
): Promise<number> => {
  const totalCountQuery = buildTotalCountQuery(params.query);
  return new Promise((resolve) => {
    axios({
      url: `${config.get('server.url')}/graphql`,
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json',
      },
      data: {
        query: totalCountQuery,
        variables: {
          filter: params.filter,
        },
      },
    }).then(({ data }) => {
      if (data.errors) {
        logger.error(data.errors[0].message);
      }
      for (const field in data.data) {
        if (Object.prototype.hasOwnProperty.call(data.data, field)) {
          resolve(data.data[field].totalCount);
        }
      }
    });
  });
};

const getFlatColumns = (columns: any[]) => {
  let index = -1;
  return columns.reduce((acc, value) => {
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
};

const getColumns = (req: any, params: exportBatchParams): Promise<any[]> => {
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
          columns.forEach((x) => {
            const queryField = params.fields.find((f) => f.name === x.name);
            x.title = queryField.title;
            if (x.subColumns) {
              x.subColumns.forEach((f) => {
                const subQueryField = queryField.subFields.find(
                  (z) => z.name === `${x.name}.${f.name}`
                );
                f.title = subQueryField.title;
              });
            }
          });
          resolve(columns);
        }
      }
    });
  });
};

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

const getRowsXlsx = async (
  req: any,
  params: exportBatchParams,
  totalCount: number,
  worksheet: Worksheet,
  columns: any[]
) => {
  // Define query to execute on server
  // todo: optimize in order to avoid using graphQL?
  const query = buildQuery(params.query);
  let offset = 0;
  const batchSize = 2000;
  let percentage = 0;
  do {
    try {
      console.log(percentage);
      await axios({
        url: `${config.get('server.url')}/graphql`,
        method: 'POST',
        headers: {
          Authorization: req.headers.authorization,
          'Content-Type': 'application/json',
        },
        data: {
          query,
          variables: {
            first: batchSize,
            skip: offset,
            sortField: params.sortField,
            sortOrder: params.sortOrder,
            filter: params.filter,
            display: true,
          },
        },
      })
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        .then(({ data }) => {
          if (data.errors) {
            console.log('ici');
            logger.error(data.errors[0].message);
          }
          for (const field in data.data) {
            if (Object.prototype.hasOwnProperty.call(data.data, field)) {
              if (data.data[field]) {
                writeRowsXlsx(
                  worksheet,
                  getFlatColumns(columns),
                  getRowsFromMeta(
                    columns,
                    data.data[field].edges.map((x) => x.node)
                  )
                );
              }
            }
          }
        });
    } catch (err) {
      console.log('fetched failed');
      logger.error(err);
    }

    offset += batchSize;
    percentage = Math.round((offset / totalCount) * 100);
  } while (offset < totalCount);
  console.log('done');
};

const getRowsCsv = async (
  req: any,
  params: exportBatchParams,
  totalCount: number,
  parser: Parser,
  columns: any[]
) => {
  // Define query to execute on server
  // todo: optimize in order to avoid using graphQL?
  const query = buildQuery(params.query);
  let offset = 0;
  const batchSize = 2000;
  let percentage = 0;
  const csvData = [];
  do {
    console.log(percentage);
    await axios({
      url: `${config.get('server.url')}/graphql`,
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json',
      },
      data: {
        query,
        variables: {
          first: batchSize,
          skip: offset,
          sortField: params.sortField,
          sortOrder: params.sortOrder,
          filter: params.filter,
          display: true,
        },
      },
    })
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      .then(({ data }) => {
        if (data.errors) {
          logger.error(data.errors[0].message);
        }
        for (const field in data.data) {
          if (Object.prototype.hasOwnProperty.call(data.data, field)) {
            if (data.data[field]) {
              for (const row of data.data[field]) {
                const temp = {};
                for (const column of columns) {
                  if (column.subColumns) {
                    temp[column.name] = get(row, column.name, []).length;
                  } else {
                    temp[column.name] = get(row, column.name, null);
                  }
                }
                csvData.push(temp);
              }
            }
          }
        }
      });
    offset += batchSize;
    percentage = Math.round((offset / totalCount) * 100);
  } while (offset < totalCount);
  console.log('done');
  // Generate the file by parsing the data, set the response parameters and send it
  const csv = parser.parse(csvData);
  return csv;
};

export default async (req: any, res: any, params: exportBatchParams) => {
  // Get total count and columns
  const [totalCount, columns] = await Promise.all([
    getTotalCount(req, params),
    getColumns(req, params),
  ]);
  switch (params.format) {
    case 'xlsx': {
      // Create file
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('test');
      worksheet.properties.defaultColWidth = 15;

      // Set headers of the file
      setHeaders(worksheet, getFlatColumns(columns));

      // Write rows
      await getRowsXlsx(req, params, totalCount, worksheet, columns);

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
      const csv = await getRowsCsv(req, params, totalCount, json2csv, columns);
      return csv;
    }
  }
};
