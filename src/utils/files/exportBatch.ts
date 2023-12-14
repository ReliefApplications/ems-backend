/* eslint-disable @typescript-eslint/no-loop-func */
import { buildMetaQuery } from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet } from 'exceljs';
import get from 'lodash/get';
import { getColumnsFromMeta } from './getColumnsFromMeta';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { Parser } from 'json2csv';
import { Record, ReferenceData, Resource } from '@models';
import mongoose from 'mongoose';
import { defaultRecordFields } from '@const/defaultRecordFields';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { getChoices } from '@utils/proxy';
import { referenceDataType } from '@const/enumTypes';
import jsonpath from 'jsonpath';
import { each, isArray, set } from 'lodash';

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
 * headers for axios queries
 *
 * @param req original request from the user
 * @returns axios headers
 */
const axiosHeaders = (req) => {
  return {
    Authorization: req.headers.authorization,
    'Content-Type': 'application/json',
    ...(req.headers.accesstoken && {
      accesstoken: req.headers.accesstoken,
    }),
  };
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
      headers: axiosHeaders(req),
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
                column.subColumns.forEach((subColumn) => {
                  const subQueryField = queryField.subFields.find(
                    (z) =>
                      z.name ===
                      `${column.name}.${subColumn.name.split('.')[0]}`
                  );
                  subColumn.title = subQueryField.title;
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
      ...(idsList ? { resource: 1 } : {}), //add the resource for subcolumns
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
 */
const getChoicesByUrl = async (
  choicesByUrlColumns: any,
  authorization: string,
  records: any
) => {
  for (const column of choicesByUrlColumns) {
    const choices = Object.fromEntries(
      (await getChoices(column.meta.field, authorization)).map((choice) => [
        choice.value,
        choice.text,
      ])
    );
    for (const record of records) {
      const resourcesField = column.field.split('.')[0];
      if (isArray(record[resourcesField])) {
        const resourcesSubfield = column.field.split('.')[1];
        each(record[resourcesField], (value) => {
          const recordValue = get(value, resourcesSubfield);
          set(
            value,
            resourcesSubfield,
            isArray(recordValue)
              ? recordValue.map((choice) => choices[choice])
              : choices[recordValue]
          );
        });
      } else {
        const recordValue = get(record, column.field);
        set(
          record,
          column.field,
          isArray(recordValue)
            ? recordValue.map((choice) => choices[choice])
            : choices[recordValue]
        );
      }
    }
  }
};

/**
 * Gets corresponding values for records with ref data
 *
 * @param referenceDataColumns columns that use reference data
 * @param resourceId resource id to get the fields from
 * @param req original request to get auth from
 * @param records records to modify
 */
const getReferenceData = async (
  referenceDataColumns: string[],
  resourceId: string,
  req: any,
  records: any
) => {
  console.log(referenceDataColumns);
  const refactoredColumns = referenceDataColumns.reduce((acc, columnName) => {
    const splitColumnName = columnName.split('.');
    const [key, value] =
      splitColumnName.length === 2
        ? splitColumnName
        : [splitColumnName.slice(0, 2).join('.'), splitColumnName[2]];
    acc[key] = [...new Set([...(acc[key] || []), value])];
    return acc;
  }, {});
  const mainResource = await Resource.findById(resourceId).select('fields');
  let mappedNestedResources: { [key: string]: any } = {};
  /** get resources fields inside */
  const nestedResources = await Resource.find({
    _id: {
      $in: Array.from(
        new Set(
          referenceDataColumns
            .filter((col) => col.split('.').length === 3)
            .map((col) => col.split('.')[0])
        )
      )
        .map((col) => {
          const firstRecordWithResource = records.find(
            (record: any) => record[col] && record[col].resource
          );
          if (firstRecordWithResource) {
            const nestedResourceId = isArray(firstRecordWithResource[col])
              ? firstRecordWithResource[col][0].resource
              : firstRecordWithResource[col].resource;
            mappedNestedResources[col] = nestedResourceId;
            return nestedResourceId;
          }
          return '';
        })
        .filter(Boolean), //remove empty strings
    },
  }).select('fields'); //get resources for nested ref data
  mappedNestedResources = Object.entries(mappedNestedResources).reduce(
    (acc, [name, nestedResourceId]) => {
      acc[name] = nestedResources.find(
        (resource) => resource.id === nestedResourceId.toString()
      );
      return acc;
    },
    {}
  );
  const referenceDataQuery = `query GetShortReferenceDataById($id: ID!) {
    referenceData(id: $id) {
      id
      name
      modifiedAt
      type
      apiConfiguration {
        name
        graphQLEndpoint
        authType
      }
      query
      fields
      valueField
      path
      data
      graphQLFilter
    }
  }`;
  for (const refDataPath in refactoredColumns) {
    const relatedResource = refDataPath.includes('.')
      ? mappedNestedResources[refDataPath.split('.')[0]]
      : mainResource; //if there is a dot, it means it is a resource/resources question, otherwise take base resource
    const fieldName = refDataPath.includes('.')
      ? refDataPath.split('.')[1]
      : refDataPath;
    if (!fieldName || !relatedResource) {
      //if no record has a reference to the nested resource, relatedResource will be null => we avoid error and there is no need for data
      continue;
    }
    console.log(relatedResource, fieldName, refDataPath, mappedNestedResources);
    const referenceDataId = relatedResource.fields.find(
      (field) => field.name === fieldName
    ).referenceData.id;
    /** Get the reference data with a detailed apiconfiguration */
    let referenceData;
    await axios({
      url: `${config.get('server.url')}/graphql`,
      method: 'POST',
      headers: axiosHeaders(req),
      data: {
        query: referenceDataQuery,
        variables: { id: referenceDataId },
      },
    })
      .then((response) => {
        referenceData = response.data.data.referenceData;
      })
      .catch((error) => {
        logger.error(error.message);
      });

    let data: any;

    if (!Object.values(referenceDataType).includes(referenceData.type)) {
      logger.error('reference data type not supported yet');
      continue;
    }
    if (referenceData.type === referenceDataType.static) {
      data = referenceData.data;
    } else {
      const axiosQuery =
        referenceData.type === referenceDataType.graphql
          ? axios({
              url: `${config.get('server.url')}/proxy/${
                (referenceData.apiConfiguration?.name ?? '') +
                (referenceData.apiConfiguration?.graphQLEndpoint ?? '')
              }`,
              method: 'POST',
              headers: axiosHeaders(req),
              data: {
                query: referenceData.query,
              },
            })
          : axios({
              url: `${config.get('server.url')}/proxy/${
                referenceData.apiConfiguration?.name + referenceData.query
              }`,
              method: 'GET',
              headers: axiosHeaders(req),
            });
      await axiosQuery
        .then((response) => {
          data = (
            referenceData.path
              ? jsonpath.query(response.data, referenceData.path)
              : response.data
          ).map((obj) => {
            const newObj = {};
            for (const key in obj) {
              newObj[ReferenceData.getGraphQLFieldName(key)] = obj[key];
            }
            return newObj;
          });
        })
        .catch((error) => {
          logger.error(error);
        });
    }

    records.forEach((record) => {
      const recordValue = get(record, refDataPath);
      set(
        record,
        refDataPath,
        isArray(recordValue)
          ? recordValue.reduce((acc, choice) => {
              const dataRow = data.find(
                (obj) => obj[referenceData.valueField] === choice
              );
              if (dataRow) {
                Object.keys(dataRow).forEach((key) => {
                  if (!acc[key]) {
                    acc[key] = [];
                  }
                  acc[key].push(dataRow[key]);
                });
              }
              return acc;
            }, {})
          : data.find(
              (obj) => obj[referenceData.valueField] === recordValue //affecting all row, not optimal but gets the job done
            )
      );
    });
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
        const { graphQLFieldName, subColumnWithoutGraphQLFieldName } =
          subColumn;
        return {
          ...subColumnWithoutGraphQLFieldName,
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
 * @param req original request
 * @returns list of data
 */
const getRecords = async (
  params: ExportBatchParams,
  columns: any[],
  req: any
) => {
  const records = await Record.aggregate<Record>(
    buildPipeline(columns, params)
  );

  const resourceResourcesColumns = getResourceAndResourcesQuestions(columns);
  let choicesByUrlColumns = columns.filter(
    (col) => col.meta?.field?.choicesByUrl
  );
  let referenceDataColumns = columns
    .filter((col) => col.meta?.field?.graphQLFieldName)
    .map((col) => col.field);

  for (const column of resourceResourcesColumns) {
    //replaces questions with ids with their actual values
    const relatedRecords = await Record.aggregate(
      buildPipeline(
        column.subColumns,
        params,
        Array.from(
          new Set(records.flatMap((record) => record[column.field]))
        ).map((id) => new mongoose.Types.ObjectId(id))
      )
    );

    choicesByUrlColumns = [
      ...choicesByUrlColumns,
      ...column.subColumns
        .filter((subCol) => subCol.meta?.field?.choicesByUrl)
        .map((subCol) => {
          return { ...subCol, field: `${column.field}.${subCol.field}` };
        }),
    ];
    referenceDataColumns = [
      ...referenceDataColumns,
      ...column.subColumns
        .filter((subCol) => subCol.meta?.field?.graphQLFieldName)
        .map((subCol) => `${column.field}.${subCol.field}`),
    ];
    console.log(referenceDataColumns, column.subColumns);

    records.forEach((record) => {
      const relatedRecordsForRecord = relatedRecords.filter((relatedRecord) =>
        record[column.field]?.includes(relatedRecord._id.toString())
      );
      record[column.field] = isArray(record[column.field])
        ? relatedRecordsForRecord
        : relatedRecordsForRecord[0]; //convert it to single record in the case of resource question
    });
  }
  await getChoicesByUrl(
    choicesByUrlColumns,
    req.headers.authorization,
    records
  );
  await getReferenceData(referenceDataColumns, params.resource, req, records);
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
  const records: Record[] = await getRecords(params, columns, req);
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
