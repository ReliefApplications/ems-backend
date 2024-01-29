/* eslint-disable @typescript-eslint/no-loop-func */
import { buildMetaQuery } from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet, stream } from 'exceljs';
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
import { each, isArray, omit, set } from 'lodash';
import { getRowsFromMeta } from './getRowsFromMeta';
import { Response } from 'express';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { accessibleBy } from '@casl/mongoose';
import getSearchFilter from '@utils/schema/resolvers/Query/getSearchFilter';

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
  fileName: string;
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
 * Generate headers for axios queries
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
            if (queryField.parent) {
              column.parent = `[${queryField.parent
                .charAt(0)
                .toUpperCase()}${queryField.parent
                .charAt(0)
                .toLowerCase()}]${queryField.parent.slice(1)}`;
            }
            if (column.subColumns) {
              if ((queryField.subFields || []).length > 0) {
                column.subColumns.forEach((subColumn) => {
                  const subQueryField = queryField.subFields.find(
                    (z) => z.name === `${column.name}.${subColumn.name}`
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
        const row = worksheet.addRow(temp);
        if (i !== 0) {
          row.eachCell((cell, colNumber) => {
            if (!subIndexes.includes(colNumber - 1)) {
              cell.font = {
                color: { argb: 'FFFFFFFF' },
              };
            }
          });
        }
        row.commit();
      }
    } else {
      const row = worksheet.addRow(temp);
      row.commit();
    }
  });
};

const recordsPipeline = (
  resource: Resource,
  columns: any,
  params: ExportBatchParams,
  req: any
) => {
  const context = req.context;
  // Add the basic records filter
  const basicFilters = {
    resource: resource._id,
    archived: { $not: { $eq: true } },
  };
  const permissionFilters = Record.find(
    accessibleBy(context.user.ability, 'read').Record
  ).getFilter();
  // Filter from the query definition
  const mongooseFilter = getFilter(params.filter, resource.fields, context);
  const filters = {
    $and: [basicFilters, mongooseFilter, permissionFilters],
  };
  const searchFilter = getSearchFilter(params.filter, resource.fields, context);
  const pipeline: any = [
    ...(searchFilter ? [searchFilter] : []),
    { $match: filters },
    {
      // todo: incorrect sorting, should respect the one from the query I think
      $sort: {
        [params.sortField]: params.sortOrder === 'asc' ? 1 : -1,
      },
    },
  ];
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
  ids?: mongoose.Types.ObjectId[]
) => {
  const projectStep = {
    $project: {
      ...columns.reduce((acc, col) => {
        const field = defaultRecordFields.find(
          (f) => f.field === col.field.split('.')[0]
        );
        if (field) {
          if (field.project) {
            acc[field.field] = field.project;
          } else {
            acc[field.field] = `$${field.field}`;
          }
        } else {
          const parentName = col.field.split('.')[0]; //We get the parent name for the resource question
          acc[parentName] = `$data.${parentName}`;
        }
        return acc;
      }, {}),
      ...(ids ? { resource: 1 } : {}), //add the resource for subcolumns
    },
  };
  const pipeline: any = [
    {
      $match: {
        $and: [
          {
            _id: {
              $in: ids,
            },
          },
          { archived: { $ne: true } },
        ],
      },
    },
    projectStep,
  ];
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
 */
const getChoicesByUrl = async (
  choicesByUrlColumns: any,
  authorization: string
) => {
  for (const column of choicesByUrlColumns) {
    const choices = await getChoices(column.meta.field, authorization);
    set(column, 'meta.field.choices', choices);
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
            (record: any) =>
              record[col] &&
              (isArray(record[col])
                ? record[col][0].resource
                : record[col].resource)
          )?.[col];
          if (firstRecordWithResource) {
            const nestedResourceId = isArray(firstRecordWithResource)
              ? firstRecordWithResource[0].resource
              : firstRecordWithResource.resource;
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
    const getReferenceDataValue = (recordValue) => {
      return isArray(recordValue)
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
          );
    };

    for (const record of records) {
      const [resourcesField, resourcesSubfield] = refDataPath.split('.');
      if (isArray(record[resourcesField]) && resourcesSubfield) {
        each(record[resourcesField], (value) => {
          const recordValue = get(value, resourcesSubfield);
          set(value, resourcesSubfield, getReferenceDataValue(recordValue));
        });
      } else {
        const recordValue = get(record, refDataPath);
        set(record, refDataPath, getReferenceDataValue(recordValue));
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
          ) &&
          !(
            col.field.startsWith('createdBy') ||
            col.field.startsWith('lastUpdatedBy')
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
          ...omit(subColumn, 'meta.field.graphQLFieldName'),
          name: subColumn.name.split('.')[1],
          field: subColumn.name.split('.')[1],
        };
      }),
    });
  });
  return resourceResourcesColumns;
};

/**
 * Add fields that are "reverse resources" to records
 *
 * @param columns Columns that need to be exported
 * @param records Records that are missing the "reverse resources" fields
 * @returns updated records
 */
const addReverseResourcesField = async (columns: any, records: any) => {
  const reverseColumns = columns.filter((col) => col.parent); //they also take the normal resources questions but that will cause no issue
  console.log(reverseColumns);
  const parentResources = await Resource.find({
    name: {
      $regex: reverseColumns.map((col) => col.parent).join('|'),
    },
  }).select('name fields');
  const promises: Promise<any>[] = [];
  for (const col of reverseColumns) {
    const parentResource = parentResources.find((resource) =>
      new RegExp(col.parent).test(resource.name)
    );
    const relatedFieldName = parentResource.fields.find(
      (field) => field.relatedName === col.field
    )?.name;
    for (const record of records) {
      if (!Object.keys(record).includes(col.field)) {
        promises.push(
          Record.find({
            resource: parentResource._id,
            ['data.' + relatedFieldName]: record._id.toString(),
          })
            .select('_id')
            .then((relatedRecords) => {
              if (relatedRecords.length > 0) {
                record[col.field] = [
                  ...relatedRecords.map((value) => value._id.toString()),
                ];
              }
            })
        );
      }
    }
  }
  await Promise.all(promises);
  return records;
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
  resource: Resource,
  params: ExportBatchParams,
  columns: any[],
  req: any
) => {
  const ability = await extendAbilityForRecords(req.context.user);
  set(req.context.user, 'ability', ability);
  console.log('Ability fetched');
  console.timeLog('export');
  const countAggregation = await Record.aggregate(
    recordsPipeline(resource, columns, params, req)
  ).facet({
    items: [
      {
        $project: {
          _id: 1,
        },
      },
    ],
    totalCount: [
      {
        $count: 'count',
      },
    ],
  });
  console.log('Count fetched');
  console.timeLog('export');
  // Get total count
  const totalCount = countAggregation[0].totalCount[0].count;
  // Create a list of all ids
  const ids = countAggregation[0].items.map((x) => x._id);
  // Build an empty list of records
  let records = new Array(totalCount);
  const recordsPromises: Promise<any>[] = [];
  // Use pagination to build efficient aggregations
  const pageSize = 100;
  for (let i = 0; i < totalCount; i += pageSize) {
    recordsPromises.push(
      Record.aggregate(
        buildPipeline(columns, params, ids.slice(i, i + pageSize))
      ).then((items) => {
        // console.log(items);
        records.splice(i, items.length, ...items);
      })
    );
  }
  // Execute all promises
  await Promise.all(recordsPromises);
  console.log('Based records fetched');
  console.timeLog('export');
  // Add related resources, not part of resource templates ( other resources than use current one in their own definition )
  records = await addReverseResourcesField(columns, records);
  console.log('Reversed records fetched');
  console.timeLog('export');

  const resourceResourcesColumns = getResourceAndResourcesQuestions(columns);

  // Get choices by url columns
  let choicesByUrlColumns = columns.filter(
    (col) => col.meta?.field?.choicesByUrl
  );
  // Get reference data columns
  let referenceDataColumns = columns
    .filter((col) => col.meta?.field?.graphQLFieldName)
    .map((col) => col.field);

  const promises: Promise<any>[] = [];

  // Build for each record aggregations to fetch related records
  for (const column of resourceResourcesColumns) {
    console.log('Fetching column: ', column.field);
    const relatedResourcePromises: Promise<any>[] = [];
    for (const record of records) {
      const columnValue = get(record, column.field) || null;
      if (columnValue) {
        relatedResourcePromises.push(
          Record.aggregate(
            buildPipeline(
              column.subColumns,
              params,
              isArray(columnValue)
                ? Array.from(new Set(columnValue)).map(
                    (id: any) => new mongoose.Types.ObjectId(id)
                  )
                : [new mongoose.Types.ObjectId(columnValue)]
            )
          ).then((relatedRecords) => {
            if (relatedRecords.length > 0) {
              if (isArray(columnValue)) {
                set(record, column.field, relatedRecords);
              } else {
                set(record, column.field, relatedRecords[0]);
              }
            }
          })
        );
      }
    }
    promises.push(Promise.all(relatedResourcePromises));

    // Add choices by url columns of related resource to the list
    choicesByUrlColumns = [
      ...choicesByUrlColumns,
      ...column.subColumns
        .filter((subCol) => subCol.meta?.field?.choicesByUrl)
        .map((subCol) => {
          return { ...subCol, field: `${column.field}.${subCol.field}` };
        }),
    ];
    // Add reference data columns of related resource to the list
    referenceDataColumns = [
      ...referenceDataColumns,
      ...column.subColumns
        .filter((subCol) => subCol.meta?.field?.graphQLFieldName)
        .map((subCol) => `${column.field}.${subCol.field}`),
    ];
  }
  promises.push(
    getChoicesByUrl(choicesByUrlColumns, req.headers.authorization)
  );
  // Execute all promises ( except from reference data ones )
  await Promise.all(promises);
  console.log('Related fields & resources fetched');
  console.timeLog('export');
  // Execute reference data aggregations
  await getReferenceData(referenceDataColumns, params.resource, req, records);
  return records;
};

// const getColumnsTest = (resource: Resource, params: ExportBatchParams) => {
//   const columns = [];
//   for (const field of params.fields) {
//     const resourceField = resource.fields.find((x) => x.name === field.name);
//     if (resourceField)) {
//       columns.push({
//         name: field.name,
//         field: field.name,
//         type: resourceField.type
//       })
//     }
//   }
// };

/**
 * Write a buffer from request, to export records as xlsx or csv
 *
 * @param req user request
 * @param res server response
 * @param resource resource to export
 * @param params export batch parameters
 * @returns xlsx or csv buffer
 */
export default async (
  req: any,
  res: Response,
  resource: Resource,
  params: ExportBatchParams
) => {
  console.log('Export batch starting');
  console.time('export');
  // Get total count and columns
  // todo: replace with resource fields
  const columns = await getColumns(req, params);
  console.log('Columns fetched');
  console.timeLog('export');
  const records: Record[] = await getRecords(resource, params, columns, req);
  console.log('Records fetched');
  console.timeLog('export');
  switch (params.format) {
    case 'xlsx': {
      let workbook: Workbook | stream.xlsx.WorkbookWriter;
      // Create a new instance of a Workbook class
      if (res.closed) {
        workbook = new Workbook();
      } else {
        workbook = new stream.xlsx.WorkbookWriter({
          stream: res,
          useStyles: true,
        });
      }
      const worksheet = workbook.addWorksheet('records');
      worksheet.properties.defaultColWidth = 15;
      // Set headers of the file
      setHeaders(worksheet, getFlatColumns(columns));
      console.log('Ready to write');
      console.timeLog('export');
      try {
        writeRowsXlsx(
          worksheet,
          getFlatColumns(columns),
          getRowsFromMeta(columns, records)
        );
      } catch (err) {
        logger.error(err.message);
      }
      console.log('Sending file');
      console.timeEnd('export');
      // Close workbook
      if (workbook instanceof stream.xlsx.WorkbookWriter) {
        workbook.commit().then(() => {
          return `${params.fileName}.xlsx`;
        });
      } else {
        return workbook.xlsx.writeBuffer();
      }
    }
    case 'csv': {
      console.log('Ready to write');
      console.timeLog('export');
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
      console.log('Sending file');
      console.timeEnd('export');
      return csv;
    }
  }
};
