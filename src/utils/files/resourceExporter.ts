/* eslint-disable @typescript-eslint/no-loop-func */
import { buildMetaQuery } from '@utils/query/queryBuilder';
import config from 'config';
import { Workbook, Worksheet, stream } from 'exceljs';
import get from 'lodash/get';
import { getColumnsFromMeta } from './getColumnsFromMeta';
import axios from 'axios';
import { logger } from '@lib/logger';
import { Parser } from 'json2csv';
import { DataTransformer, Record, Resource } from '@models';
import mongoose from 'mongoose';
import { defaultRecordFields } from '@const/defaultRecordFields';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { getChoices } from '@utils/proxy';
import { referenceDataType } from '@const/enumTypes';
import jsonpath from 'jsonpath';
import { cloneDeep, each, isArray, omit, set } from 'lodash';
import { getRowsFromMeta } from './getRowsFromMeta';
import { Response } from 'express';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { accessibleBy } from '@casl/mongoose';
import getSearchFilter from '@utils/schema/resolvers/Query/getSearchFilter';
import getSortAggregation from '@utils/schema/resolvers/Query/getSortAggregation';
import dataSources from '@server/apollo/dataSources';

/**
 * Export batch parameters interface
 */
interface ExportBatchParams {
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sort?: any[];
  resource?: string;
  timeZone: string;
  fileName: string;
}

/**
 * Resource exporter class.
 * Can generate a xlsx or csv files from request definition.
 */
export default class Exporter {
  private req: any;

  private res: Response;

  private resource: Resource;

  private params: ExportBatchParams;

  private columns: any[];

  /**
   * Resource exporter class.
   * Built from express request, response, resource & parameters.
   *
   * @param req user request
   * @param res server response
   * @param resource resource to export
   * @param params export batch parameters
   */
  constructor(
    req: any,
    res: Response,
    resource: Resource,
    params: ExportBatchParams
  ) {
    this.req = req;
    this.res = res;
    this.resource = resource;
    this.params = params;
  }

  /**
   * Write a buffer from request, to export records as xlsx or csv
   *
   * @returns xlsx or csv buffer
   */
  public async export() {
    // Get total count and columns
    // todo: replace with resource fields
    await this.getColumns();
    const records: Record[] = await this.getRecords();
    switch (this.params.format) {
      case 'xlsx': {
        let workbook: Workbook | stream.xlsx.WorkbookWriter;
        // Create a new instance of a Workbook class
        if (this.res.closed) {
          workbook = new Workbook();
        } else {
          workbook = new stream.xlsx.WorkbookWriter({
            stream: this.res,
            useStyles: true,
          });
        }
        const worksheet = workbook.addWorksheet('records');
        // Set headers of the file
        this.setHeaders(worksheet);
        try {
          this.writeRowsXlsx(worksheet, getRowsFromMeta(this.columns, records));
        } catch (err) {
          logger.error(err.message);
        }
        // Close workbook
        if (workbook instanceof stream.xlsx.WorkbookWriter) {
          workbook.commit().then(() => {
            return `${this.params.fileName}.xlsx`;
          });
        } else {
          return workbook.xlsx.writeBuffer();
        }
      }
      case 'csv': {
        // Create a string array with the columns' labels or names as fallback, then construct the parser from it
        const fields = this.columns.flatMap((x) => ({
          label: x.title,
          value: x.name,
        }));
        const json2csv = new Parser({ fields });
        // Generate csv, by parsing the data
        const csvData = [];
        try {
          for (const row of records) {
            const temp = {};
            for (const column of this.columns) {
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
  }

  /**
   * Get columns from parameters
   *
   * @returns columns as promise
   */
  private getColumns = (): Promise<void> => {
    const metaQuery = buildMetaQuery(this.params.query);
    return new Promise((resolve) => {
      axios({
        url: `${config.get('server.url')}/graphql`,
        method: 'POST',
        headers: this.axiosHeaders(),
        data: {
          query: metaQuery,
        },
      }).then(async ({ data }) => {
        for (const field in data.data) {
          if (Object.prototype.hasOwnProperty.call(data.data, field)) {
            const meta = data.data[field];
            const rawColumns = getColumnsFromMeta(meta, this.params.fields);
            const columns = rawColumns.filter((x) =>
              this.params.fields.find((f) => f.name === x.name)
            );
            // Edits the column to match with the fields
            for (const column of columns) {
              const queryField = this.params.fields.find(
                (f) => f.name === column.name
              );
              column.title = queryField.title;
              if (column.subColumns) {
                // Field does not exist in the template
                if (!this.resource.fields.find((f) => f.name === column.name)) {
                  const relatedResource = await Resource.findOne({
                    fields: {
                      $elemMatch: {
                        resource: this.resource._id.toString(),
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
            this.columns = columns;
            resolve();
          }
        }
      });
    });
  };

  /**
   * Get records to put into the file
   *
   * @returns list of data
   */
  private getRecords = async () => {
    const ability = await extendAbilityForRecords(this.req.context.user);
    set(this.req.context.user, 'ability', ability);
    const contextDataSources = (
      await dataSources({
        // Passing upstream request so accesstoken can be used for authentication
        req: this.req,
      } as any)
    )();
    set(this.req.context, 'dataSources', contextDataSources);
    const sort = await getSortAggregation(
      this.params.sort,
      this.resource.fields,
      this.req.context
    );
    const countAggregation = await Record.aggregate(
      await this.recordsPipeline()
    ).facet({
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
    // Get total count
    const totalCount = countAggregation[0].totalCount[0].count;
    // Create a list of all ids
    const ids = countAggregation[0].items.map((x) => x._id);
    // Build an empty list of records
    const records = new Array(totalCount);
    const recordsPromises: Promise<any>[] = [];
    // Use pagination to build efficient aggregations
    const pageSize = 100;
    for (let i = 0; i < totalCount; i += pageSize) {
      recordsPromises.push(
        Record.aggregate(
          this.buildPipeline(this.columns, ids.slice(i, i + pageSize))
        ).then((items) => {
          records.splice(i, items.length, ...items);
        })
      );
    }
    // Execute all promises
    await Promise.all(recordsPromises);

    // Find all resource & resources question
    const resourceResourcesColumns = this.getResourceAndResourcesQuestions();

    // Get choices by url columns
    let choicesByUrlColumns = this.columns.filter(
      (col) => col.meta?.field?.choicesByUrl
    );
    // Get reference data columns
    let referenceDataColumns = this.columns
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
            Record.aggregate(this.buildReversedPipeline(column, record)).then(
              (relatedRecords) => {
                if (relatedRecords.length > 0) {
                  set(record, column.field, relatedRecords);
                }
              }
            )
          );
        } else {
          // Link is defined in currently exported resource
          const columnValue = get(record, column.field) || null;
          if (columnValue) {
            relatedResourcePromises.push(
              Record.aggregate(
                this.buildPipeline(
                  column.subColumns,
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
    promises.push(this.getChoicesByUrl(choicesByUrlColumns));
    // Execute all promises ( except from reference data ones )
    await Promise.all(promises);
    // Execute reference data aggregations
    await this.getReferenceData(referenceDataColumns, records);
    return records;
  };

  /**
   * Build records pipeline
   *
   * @returns main records pipeline
   */
  private recordsPipeline = async () => {
    const context = this.req.context;
    // Add the basic records filter
    const basicFilters = {
      resource: this.resource._id,
      archived: { $not: { $eq: true } },
    };
    const permissionFilters = Record.find(
      accessibleBy(context.user.ability, 'read').Record
    ).getFilter();
    // Filter from the query definition
    const mongooseFilter = getFilter(
      this.params.filter,
      this.resource.fields,
      context
    );
    const filters = {
      $and: [basicFilters, mongooseFilter, permissionFilters],
    };
    const searchFilter = getSearchFilter(
      this.params.filter,
      this.resource.fields,
      context
    );
    const pipeline: any = [
      ...(searchFilter ? [searchFilter] : []),
      { $match: filters },
    ];
    this.columns
      .filter((col) => col.meta?.field?.isCalculated)
      .forEach((col) =>
        pipeline.unshift(
          ...(buildCalculatedFieldPipeline(
            col.meta.field.expression,
            col.meta.field.name,
            this.params.timeZone
          ) as any)
        )
      );
    return pipeline;
  };

  /**
   * Builds the pipeline to fetch records
   *
   * @param columns list of available columns
   * @param ids list of ids, used in the case of subcolumns (resource and resources)
   * @returns a built pipeline
   */
  private buildPipeline = (columns: any[], ids: mongoose.Types.ObjectId[]) => {
    const permissionFilters = Record.find(
      accessibleBy(this.req.context.user.ability, 'read').Record
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
            this.params.timeZone
          ) as any)
        )
      );
    return pipeline;
  };

  /**
   * Build reversed records pipeline
   *
   * @param column current column
   * @param record current record
   * @returns reversed pipeline
   */
  private buildReversedPipeline = (column: any, record: any) => {
    const relatedFieldName = column.parent.fields.find(
      (field) => field.relatedName === column.field
    )?.name;
    const permissionFilters = Record.find(
      accessibleBy(this.req.context.user.ability, 'read').Record
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
            this.params.timeZone
          ) as any)
        )
      );
    return pipeline;
  };

  /**
   * Set headers of file
   *
   * @param worksheet worksheet to apply headers on
   */
  private setHeaders = (worksheet: Worksheet) => {
    const columns = this.getFlatColumns();
    // Create header row, and style it
    const headerRow = worksheet.addRow(columns.map((x: any) => x.title));
    worksheet.columns = columns.map(() => ({ width: 15 }));
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
   * @returns axios headers
   */
  private axiosHeaders = () => {
    return {
      Authorization: this.req.headers.authorization,
      'Content-Type': 'application/json',
      ...(this.req.headers.accesstoken && {
        accesstoken: this.req.headers.accesstoken,
      }),
    };
  };

  /**
   * Get flat columns from raw columns
   *
   * @returns flat columns
   */
  private getFlatColumns = () => {
    let index = -1;
    return this.columns.reduce((acc, value) => {
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
   * Write rows in xlsx format
   *
   * @param worksheet worksheet to write on
   * @param records records to write as rows
   */
  private writeRowsXlsx = (worksheet: Worksheet, records: any[]) => {
    const columns = this.getFlatColumns();
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
        const subIndexes = columns
          .filter((x) => x.subTitle)
          .map((x) => x.index);
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

  /**
   * Gets right value for choices by url questions
   *
   * @param choicesByUrlColumns columns with choices by url
   */
  private getChoicesByUrl = async (choicesByUrlColumns: any) => {
    for (const column of choicesByUrlColumns) {
      const choices = await getChoices(
        column.meta.field,
        this.req.headers.authorization
      );
      set(column, 'meta.field.choices', choices);
    }
  };

  /**
   * Gets corresponding values for records with ref data
   *
   * @param referenceDataColumns columns that use reference data
   * @param records records to modify
   */
  private getReferenceData = async (
    referenceDataColumns: string[],
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
        : this.resource; //if there is a dot, it means it is a resource/resources question, otherwise take base resource
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
        headers: this.axiosHeaders(),
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
                headers: this.axiosHeaders(),
                data: {
                  query: referenceData.query,
                },
              })
            : axios({
                url: `${config.get('server.url')}/proxy/${
                  referenceData.apiConfiguration?.name + referenceData.query
                }`,
                method: 'GET',
                headers: this.axiosHeaders(),
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
   * Gets resource and resources questions
   *
   * @returns a list of resource and resources columns
   */
  private getResourceAndResourcesQuestions = () => {
    /** Resources columns */
    const resourceResourcesColumns = this.columns.filter(
      (col) => col.subColumns
    );
    /** Add resource columns */
    const resourceColumns = new Set(
      this.columns
        .filter(
          (col) =>
            col.field.includes('.') &&
            !(
              col.meta.field.graphQLFieldName &&
              col.field.split('.').length === 2
            ) &&
            !(
              col.field.startsWith('createdBy') ||
              col.field.startsWith('lastUpdatedBy')
            )
        )
        .map((col) => col.field.split('.')[0])
    );
    resourceColumns.forEach((resourceQuestion) => {
      const resourceSubColumns = this.columns.filter(
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
}
