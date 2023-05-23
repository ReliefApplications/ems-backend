import {
  buildQuery,
  buildMetaQuery,
  buildTotalCountQuery,
} from '../query/queryBuilder';
import { getColumnsFromMeta, getRowsFromMeta } from '.';
import config from 'config';
import axios from 'axios';
import { logger } from '@services/logger.service';

interface exportBatchParams {
  ids?: string[];
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

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

const getRows = async (
  req: any,
  params: exportBatchParams,
  totalCount: number,
  columns: any[]
) => {
  // Define query to execute on server
  // todo: optimize in order to avoid using graphQL?
  const query = buildQuery(params.query);
  let offset = 0;
  const batchSize = 2000;
  let percentage = 0;
  const rows: any[] = [];
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
            logger.error(data.errors[0].message);
          }
          for (const field in data.data) {
            if (Object.prototype.hasOwnProperty.call(data.data, field)) {
              if (data.data[field]) {
                rows.push(
                  ...getRowsFromMeta(
                    columns,
                    data.data[field].edges.map((x) => x.node)
                  )
                );
              }
            }
          }
        });
    } catch (err) {
      logger.error(err);
    }

    offset += batchSize;
    percentage = Math.round((offset / totalCount) * 100);
  } while (offset < totalCount);
  return rows;
};

/**
 * Export records with passed grid config and format option
 *
 * @param params Root object for all parameters
 * @param params.ids List of ids of the records to export
 * @param params.fields List of the names of the fields we want to export
 * @param params.filter If any set, list of the filters we want to apply
 * @param params.format Target format (excel or csv)
 * @param params.query Query parameters to build it
 * @param params.sortField Sort field name if any
 * @param params.sortOrder Sort order if any
 * @param token Authorization header to request against ourself
 * @returns Columns and rows to write
 */
export const extractGridData = async (
  req: any,
  params: exportBatchParams
): Promise<{ columns: any[]; rows: any[] }> => {
  // Get total count and columns
  const [totalCount, columns] = await Promise.all([
    getTotalCount(req, params),
    getColumns(req, params),
  ]);

  const rows = await getRows(req, params, totalCount, columns);

  return { columns, rows };
};
