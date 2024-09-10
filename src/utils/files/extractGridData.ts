import {
  buildQuery,
  buildMetaQuery,
  buildTotalCountQuery,
} from '../query/queryBuilder';
import { getColumnsFromMeta, getRowsFromMeta } from '.';
import config from 'config';
import axios from 'axios';
import { logger } from '@lib/logger';

/**
 * Grid extraction parameters
 */
interface GridExtractParams {
  ids?: string[];
  fields?: any[];
  filter?: any;
  format: 'csv' | 'xlsx';
  query: any;
  sort?: any;
}

/**
 * Get total count from request
 *
 * @param req current request
 * @param params grid extraction parameters
 * @returns total count as promise
 */
const getTotalCount = (
  req: any,
  params: GridExtractParams
): Promise<number> => {
  const totalCountQuery = buildTotalCountQuery(params.query);
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

/**
 * Get rows
 *
 * @param req current request
 * @param params grid extraction parameters
 * @param totalCount total count of records
 * @param columns columns to use
 * @returns rows from request
 */
const getRows = async (
  req: any,
  params: GridExtractParams,
  totalCount: number,
  columns: any[]
) => {
  // Define query to execute on server
  // todo: optimize in order to avoid using graphQL?
  const query = buildQuery(params.query);
  let offset = 0;
  // Maximum page size is 1000
  const batchSize = 1000;
  const rows: any[] = [];
  do {
    try {
      await axios({
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
          query,
          variables: {
            first: batchSize,
            skip: offset,
            sort: params.sort,
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
  } while (offset < totalCount);
  return rows;
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
  const [totalCount, columns] = await Promise.all([
    getTotalCount(req, params),
    getColumns(req, params),
  ]);

  const rows = await getRows(req, params, totalCount, columns);

  return { columns, rows };
};
