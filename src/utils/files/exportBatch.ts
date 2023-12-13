import { buildMetaQuery } from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet } from 'exceljs';
import get from 'lodash/get';
import { getColumnsFromMeta } from './getColumnsFromMeta';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { Parser } from 'json2csv';
import { Record } from '@models';
import mongoose from 'mongoose';
import { defaultRecordFields } from '@const/defaultRecordFields';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { getChoices } from '@utils/proxy';

/**
 * Export batch parameters interface
 */
interface ExportBatchParams {
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  resource?: string;
  timeZone: string;
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
        ...(req.headers.accesstoken && {
          accesstoken: req.headers.accesstoken,
        }),
      },
      data: {
        query: metaQuery,
      },
    }).then(({ data }) => {
      for (const field in data.data) {
        if (Object.prototype.hasOwnProperty.call(data.data, field)) {
          const meta = data.data[field];
          console.log(JSON.stringify(meta));
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
    for (const column of columns) {
      if (column.subTitle) {
        const value = get(record, column.field, []);
        maxFieldLength = Math.max(maxFieldLength, value.length);
        temp.push('');
      } else {
        temp.push(get(record, column.field, null));
      }
    }

    if (maxFieldLength > 0) {
      const subIndexes = columns.filter((x) => x.subTitle).map((x) => x.index);
      for (let i = 0; i < maxFieldLength; i++) {
        for (const column of columns.filter((x: any) => x.subTitle)) {
          const value = get(record, column.field, []);
          if (value && value.length > 0) {
            temp[column.index] = get(
              get(record, column.field, null)[i],
              column.subField,
              null
            );
          } else {
            temp[column.index] = null;
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
 * Builds the pipeline to fetch records
 *
 * @param columns Columns needed in the export
 * @param params export parameters
 * @param idsList list of ids, used in the case of subcolumns (resource and resources)
 * @returns a built pipeline
 */
const buildPipeline = (
  columns: any,
  params: ExportBatchParams,
  idsList?: mongoose.Types.ObjectId[]
) => {
  let pipeline: any;

  const projectStep = {
    $project: {
      ...columns.reduce((acc, col) => {
        if (defaultRecordFields.some((field) => field.field === col.field)) {
          acc[col.field] = `$${col.field}`;
        } else {
          const parentName = col.field.split('.')[0]; //We get the parent name for the resource question
          acc[parentName] = `$data.${parentName}`;
        }
        return acc;
      }, {}),
    },
  };
  if (!idsList) {
    //idsList is used when getting subcolumns
    pipeline = [
      {
        $match: {
          $and: [
            { resource: new mongoose.Types.ObjectId(params.resource) },
            getFilter(params.filter, columns),
            { archived: { $ne: true } },
          ],
        },
      },
      projectStep,
      {
        $sort: {
          [params.sortField]: params.sortOrder === 'asc' ? 1 : -1,
        },
      },
    ];
  } else {
    pipeline = [
      {
        $match: {
          $and: [
            {
              _id: {
                $in: idsList,
              },
            },
            { archived: { $ne: true } },
          ],
        },
      },
      projectStep,
    ];
  }
  columns
    .filter((col) => col.meta?.field?.isCalculated)
    .forEach((col) =>
      pipeline.unshift(
        ...(buildCalculatedFieldPipeline(
          col.meta.field.expression,
          col.meta.field.name,
          params.timeZone
        ) as any)
      )
    );
  return pipeline;
};

/**
 * Gets right value for choices by url questions
 *
 * @param choicesByUrlColumns columns with choices by url
 * @param authorization authorization token to fetch choices by url
 * @param records records to modify with correct value
 * @param columnField column field if subcolumn
 */
const getChoicesByUrl = async (
  choicesByUrlColumns: any,
  authorization: string,
  records: any,
  columnField?: string
) => {
  for (const column of choicesByUrlColumns) {
    const choices = Object.fromEntries(
      (await getChoices(column.meta.field, authorization)).map((country) => [
        country.value,
        country.text,
      ])
    );
    for (const record of records) {
      if (columnField) {
        record[columnField][column.field] =
          choices[record[columnField][column.field]];
      } else {
        record[column.field] = choices[record[column.field]];
      }
    }
  }
};

/**
 * Gets resource and resources questions
 *
 * @param columns columns to extract the resource and resources columns
 * @returns a list of resource and resources columns
 */
const getResourceAndResourcesQuestions = (columns: any) => {
  /** Resources columns */
  const resourceResourcesColumns = columns.filter((col) => col.subColumns);
  /** Add resource columns */
  const resourceColumns = new Set(
    columns
      .filter(
        (col) =>
          col.field.includes('.') &&
          !(
            col.meta.field.graphQLFieldName && col.field.split('.').length === 2
          )
      )
      .map((col) => col.field.split('.')[0])
  );
  resourceColumns.forEach((resourceQuestion) => {
    const resourceSubColumns = columns.filter(
      (col) => col.field.split('.')[0] === resourceQuestion
    );
    resourceResourcesColumns.push({
      field: resourceQuestion,
      subColumns: resourceSubColumns.map((subColumn) => {
        return {
          ...subColumn,
          name: subColumn.name.split('.')[1],
          field: subColumn.name.split('.')[1],
        };
      }),
    });
  });
  return resourceResourcesColumns;
};

/**
 * Get records to put into the file
 *
 * @param params export batch parameters
 * @param columns columns to use
 * @param authorization auth token to access url choices
 * @returns list of data
 */
const getRecords = async (
  params: ExportBatchParams,
  columns: any[],
  authorization: string
) => {
  const records = await Record.aggregate<Record>(
    buildPipeline(columns, params)
  );

  getChoicesByUrl(
    columns.filter(
      (col) => col.meta?.field?.choicesByUrl && !col.field.includes('.') //dot questions are treated with resources
    ),
    authorization,
    records
  );

  const referenceDataColumns = columns.filter(
    (col) => col.meta?.field?.graphQLFieldName
  );
  for (const column of referenceDataColumns) {
    const choices = Object.fromEntries(
      column.meta.field.choices.map((choice) => [choice.value, choice.text])
    );
    records.forEach((record) => {
      record[column.field.split('.')[0]] =
        choices[record[column.field.split('.')[0]]];
    });
  }

  const resourceResourcesColumns = getResourceAndResourcesQuestions(columns);

  for (const column of resourceResourcesColumns) {
    const relatedRecords = await Record.aggregate(
      buildPipeline(
        column.subColumns,
        params,
        Array.from(
          new Set(records.flatMap((record) => record[column.field]))
        ).map((id) => new mongoose.Types.ObjectId(id))
      )
    );

    records.forEach((record) => {
      const relatedRecordsForRecord = relatedRecords.filter((relatedRecord) =>
        record[column.field]?.includes(relatedRecord._id.toString())
      );
      record[column.field] =
        typeof record[column.field] === 'string'
          ? relatedRecordsForRecord[0]
          : relatedRecordsForRecord;
    });

    getChoicesByUrl(
      column.subColumns.filter((col) => col.meta?.field?.choicesByUrl),
      authorization,
      records,
      column.field
    );
  }
  console.log(records);
  return records;
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
  const columns = await getColumns(req, params);
  const records: Record[] = await getRecords(
    params,
    columns,
    req.headers.authorization
  );
  switch (params.format) {
    case 'xlsx': {
      // Create file
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('records');
      worksheet.properties.defaultColWidth = 15;
      // Set headers of the file
      setHeaders(worksheet, getFlatColumns(columns));
      try {
        writeRowsXlsx(worksheet, getFlatColumns(columns), records);
      } catch (err) {
        logger.error(err.message);
      }
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
      const csvData = [];
      try {
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
      const csv = json2csv.parse(csvData);
      return csv;
    }
  }
};
