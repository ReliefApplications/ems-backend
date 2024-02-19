import { buildMetaQuery } from '../query/queryBuilder';
import { getColumnsFromMeta } from '.';
import config from 'config';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { Resource } from '@models/resource.model';
import { DataTransformer, Record } from '@models';
import mongoose from 'mongoose';
import { defaultRecordFields } from '@const/defaultRecordFields';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { accessibleBy } from '@casl/mongoose';
import { cloneDeep, each, get, isArray, omit, set } from 'lodash';
import { getChoices } from '@utils/proxy';
import jsonpath from 'jsonpath';
import { referenceDataType } from '@const/enumTypes';
import getSearchFilter from '@utils/schema/resolvers/Query/getSearchFilter';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import dataSources from '@server/apollo/dataSources';
import getSortAggregation from '@utils/schema/resolvers/Query/getSortAggregation';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

/**
 * Grid extraction parameters
 */
interface GridExtractParams {
  ids?: string[];
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  resource: string;
  timeZone: string;
}

/**
 * Build records pipeline
 *
 * @param req current request
 * @param params grid extraction parameters
 * @param columns list of available columns
 * @param resource current resource
 * @returns main records pipeline
 */
const recordsPipeline = async (
  req: any,
  params: GridExtractParams,
  columns: any[],
  resource: Resource
) => {
  const context = req.context;
  // Add the basic records filter
  const basicFilters = {
    resource: params.resource,
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
 * Get total count and ids from request
 *
 * @param req current request
 * @param params grid extraction parameters
 * @param columns list of available columns
 * @returns total count as promise
 */
const getTotalCountAndIds = async (
  req: any,
  params: GridExtractParams,
  columns: any[]
): Promise<{ totalCount: number; ids: string[] }> => {
  const ability = await extendAbilityForRecords(req.context.user);
  const resource = await Resource.findOne({ _id: params.resource });
  set(req.context.user, 'ability', ability);
  const contextDataSources = (
    await dataSources({
      // Passing upstream request so accesstoken can be used for authentication
      req: req,
    } as any)
  )();
  set(req.context, 'dataSources', contextDataSources);
  const sort = await getSortAggregation(
    params.sortField,
    params.sortOrder,
    resource.fields,
    req.context
  );
  const pipelineRecords = await recordsPipeline(req, params, columns, resource);
  console.log(JSON.stringify(pipelineRecords, null, 2), 'pipelineRecords');
  const countAggregation = await Record.aggregate(pipelineRecords).facet({
    items: [
      ...sort,
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
  const totalCount = countAggregation[0].totalCount[0].count;
  const ids = countAggregation[0].items.map((x) => x._id);

  return { totalCount, ids };
};

/**
 * Get columns from request
 *
 * @param req current request
 * @param params grid extraction parameters
 * @returns columns as promise
 */
const getColumns = (req: any, params: GridExtractParams): Promise<any[]> => {
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
    }).then(async ({ data }) => {
      for (const field in data.data) {
        if (Object.prototype.hasOwnProperty.call(data.data, field)) {
          const meta = data.data[field];
          const rawColumns = getColumnsFromMeta(meta, params.fields);
          const columns = rawColumns.filter((x) =>
            params.fields.find((f) => f.name === x.name)
          );
          // Edits the column to match with the fields
          for (const column of columns) {
            const queryField = params.fields.find(
              (f) => f.name === column.name
            );
            column.title = queryField.title;
            if (column.subColumns) {
              // Field does not exist in the template
              if (!params.fields.find((f) => f.name === column.name)) {
                const relatedResource = await Resource.findOne({
                  fields: {
                    $elemMatch: {
                      resource: params.resource.toString(),
                      relatedName: column.name,
                    },
                  },
                }).select('fields');
                if (relatedResource) {
                  column.parent = relatedResource;
                }
              }
              if ((queryField.subFields || []).length > 0) {
                column.subColumns.forEach((subColumn) => {
                  const subQueryField = queryField.subFields.find(
                    (z) => z.name === `${column.name}.${subColumn.name}`
                  );
                  subColumn.title = subQueryField.title;
                });
              }
            }
          }
          resolve(columns);
        }
      }
    });
  });
};

/**
 * Builds the pipeline to fetch records
 *
 * @param columns list of available columns
 * @param ids list of ids, used in the case of subcolumns (resource and resources)
 * @param timeZone the user's timezone
 * @param req the current request
 * @returns a built pipeline
 */
export const buildPipelineGrid = (
  columns: any[],
  ids: mongoose.Types.ObjectId[],
  timeZone: string,
  req: any
) => {
  const permissionFilters = Record.find(
    accessibleBy(req.context.user.ability, 'read').Record
  ).getFilter();
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
          permissionFilters,
        ],
      },
    },
    projectStep,
    {
      $addFields: {
        __order: {
          $indexOfArray: [ids, '$_id'],
        },
      },
    },
    {
      $sort: {
        __order: 1,
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
          timeZone
        ) as any)
      )
    );
  return pipeline;
};

/**
 * Gets resource and resources questions
 *
 * @param columns list of available columns
 * @returns a list of resource and resources columns
 */
export const getResourceAndResourcesQuestions = (columns: any[]) => {
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
 * Build reversed records pipeline
 *
 * @param column current column
 * @param record current record
 * @param req current request
 * @param params grid extraction parameters
 * @returns reversed pipeline
 */
export const buildReversedPipelineGrid = (
  column: any,
  record: any,
  req: any,
  params: GridExtractParams
) => {
  const relatedFieldName = column.parent.fields.find(
    (field) => field.relatedName === column.field
  )?.name;
  const permissionFilters = Record.find(
    accessibleBy(req.context.user.ability, 'read').Record
  ).getFilter();
  const projectStep = {
    $project: {
      ...column.subColumns.reduce((acc, col) => {
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
      resource: 1,
    },
  };
  const pipeline: any = [
    {
      $match: {
        $and: [
          {
            resource: column.parent._id,
            [`data.${relatedFieldName}`]: record._id.toString(),
            archived: { $not: { $eq: true } },
          },
          permissionFilters,
        ],
      },
    },
    projectStep,
  ];
  column.subColumns
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
 * Generate headers for axios queries
 *
 * @param req current request
 * @returns axios headers
 */
export const axiosHeaders = (req: any) => {
  return {
    Authorization: req.headers.authorization,
    'Content-Type': 'application/json',
    ...(req.headers.accesstoken && {
      accesstoken: req.headers.accesstoken,
    }),
  };
};

/**
 * Gets right value for choices by url questions
 *
 * @param choicesByUrlColumns columns with choices by url
 * @param req current request
 */
export const getChoicesByUrl = async (choicesByUrlColumns: any, req: any) => {
  for (const column of choicesByUrlColumns) {
    const choices = await getChoices(
      column.meta.field,
      req.headers.authorization
    );
    set(column, 'meta.field.choices', choices);
  }
};

/**
 * Gets corresponding values for records with ref data
 *
 * @param referenceDataColumns columns that use reference data
 * @param records records to modify
 * @param params grid extraction parameters
 * @param req current request
 */
export const getReferenceData = async (
  referenceDataColumns: string[],
  records: any,
  params: GridExtractParams,
  req: any
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
      : params.resource; //if there is a dot, it means it is a resource/resources question, otherwise take base resource
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
          data = referenceData.path
            ? jsonpath.query(response.data, referenceData.path)
            : response.data;
        })
        .catch((error) => {
          logger.error(error);
        });
    }

    /**
     * Find reference data from record value
     *
     * @param recordValue record value
     * @returns void
     */
    const getReferenceDataValue = (recordValue) => {
      return isArray(recordValue)
        ? recordValue.reduce((acc, choice) => {
            const dataRow = data.find(
              (obj) => obj[referenceData.valueField] === choice
            );
            if (dataRow) {
              const transformer = new DataTransformer(
                referenceData.fields,
                cloneDeep([dataRow])
              );
              const transformedObject = transformer.transformData()[0];
              Object.keys(transformedObject).forEach((key) => {
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(transformedObject[key]);
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
 * Get rows
 *
 * @param req current request
 * @param params grid extraction parameters
 * @param totalCount total count of records
 * @param columns columns to use
 * @param resquestIds list of ids
 * @returns rows from request
 */
const getRows = async (
  req: any,
  params: GridExtractParams,
  totalCount: number,
  columns: any[],
  resquestIds: string[]
) => {
  const records = new Array(totalCount);
  const recordsPromises: Promise<any>[] = [];
  // Use pagination to build efficient aggregations
  const pageSize = 100;
  console.log(params.ids, "ids");
  for (let i = 0; i < totalCount; i += pageSize) {
    const ids = resquestIds
      .slice(i, i + pageSize)
      .map((id) => new mongoose.Types.ObjectId(id));
    recordsPromises.push(
      Record.aggregate(
        buildPipelineGrid(columns, ids, params.timeZone, req)
      ).then((items) => {
        records.splice(i, items.length, ...items);
      })
    );
  }
  // Execute all promises
  await Promise.all(recordsPromises);

  // Find all resource & resources question
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
    const relatedResourcePromises: Promise<any>[] = [];
    for (const record of records) {
      // Reversed relationship, the resource is used in another resource's template
      if (column.parent) {
        relatedResourcePromises.push(
          Record.aggregate(
            buildReversedPipelineGrid(column, record, req, params)
          ).then((relatedRecords) => {
            if (relatedRecords.length > 0) {
              set(record, column.field, relatedRecords);
            }
          })
        );
      } else {
        // Link is defined in currently exported resource
        const columnValue = get(record, column.field) || null;
        if (columnValue) {
          relatedResourcePromises.push(
            Record.aggregate(
              buildPipelineGrid(
                column.subColumns,
                isArray(columnValue)
                  ? Array.from(new Set(columnValue)).map(
                      (id: any) => new mongoose.Types.ObjectId(id)
                    )
                  : [new mongoose.Types.ObjectId(columnValue)],
                params.timeZone,
                req
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
  promises.push(getChoicesByUrl(choicesByUrlColumns, req));
  // Execute all promises ( except from reference data ones )
  await Promise.all(promises);
  // Execute reference data aggregations
  await getReferenceData(referenceDataColumns, records, params, req);

  return records;
};

/**
 * Export records with passed grid config and format option
 *
 * @param req current request
 * @param params grid extraction parameters
 * @returns Columns and rows to write
 */
export const extractGridData = async (
  req: any,
  params: GridExtractParams
): Promise<{ columns: any[]; rows: any[] }> => {
  // Get total count and columns
  const columns = await getColumns(req, params);
  const { totalCount, ids } = await getTotalCountAndIds(req, params, columns);
  console.log(totalCount, "total count");
  const rows = await getRows(req, params, totalCount, columns, ids);
  return { columns, rows };
};
