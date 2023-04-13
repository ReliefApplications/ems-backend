import {
  buildQuery,
  buildMetaQuery,
  buildTotalCountQuery,
} from '../query/queryBuilder';
import { getColumnsFromMeta, getRowsFromMeta } from '.';
import config from 'config';
import axios from 'axios';
import { logger } from '@services/logger.service';

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
  params: {
    ids?: string[];
    fields?: any[];
    filter?: any;
    format: 'csv' | 'xlsx';
    query: any;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  },
  token: string
): Promise<{ columns: any[]; rows: any[] }> => {
  const totalCountQuery = buildTotalCountQuery(params.query);
  const query = buildQuery(params.query);
  const metaQuery = buildMetaQuery(params.query);

  let meta: any;
  let totalCount = 0;

  const gqlTotalCountQuery = axios({
    url: `${config.get('server.url')}/graphql`,
    method: 'POST',
    headers: {
      Authorization: token,
      // 'Content-Type': 'application/json',
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
        totalCount = data.data[field].totalCount;
      }
    }
  });

  const gqlMetaQuery = axios({
    url: `${config.get('server.url')}/graphql`,
    method: 'POST',
    headers: {
      Authorization: token,
      // 'Content-Type': 'application/json',
    },
    data: {
      query: metaQuery,
    },
  }).then(({ data }) => {
    for (const field in data.data) {
      if (Object.prototype.hasOwnProperty.call(data.data, field)) {
        meta = data.data[field];
      }
    }
  });

  await Promise.all([gqlTotalCountQuery, gqlMetaQuery]);

  const queryResult: { index: number; records: any[] }[] = [];

  let i = 0;
  const PAGE_SIZE = 100;
  const promises = [];
  while (i * PAGE_SIZE < totalCount) {
    const index = i;
    promises.push(
      axios({
        url: `${config.get('server.url')}/graphql`,
        method: 'POST',
        headers: {
          Authorization: token,
          // 'Content-Type': 'application/json',
        },
        data: {
          query,
          variables: {
            first: PAGE_SIZE,
            skip: i * PAGE_SIZE,
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
                queryResult.push({
                  index,
                  records: data.data[field].edges.map((x) => x.node),
                });
              }
            }
          }
        })
    );
    i += 1;
  }
  await Promise.all(promises);

  const records: any[] = [];
  for (const result of queryResult.sort((a, b) => a.index - b.index)) {
    records.push(...result.records);
  }

  const rawColumns = getColumnsFromMeta(meta, params.fields);
  const columns = rawColumns.filter((x) =>
    params.fields.find((y) => y.name === x.name)
  );
  const rows = await getRowsFromMeta(columns, records);

  // Edits the column to match with the fields
  columns.forEach((x) => {
    const queryField = params.fields.find((y) => y.name === x.name);
    x.title = queryField.title;
    if (x.subColumns) {
      x.subColumns.forEach((y) => {
        const subQueryField = queryField.subFields.find(
          (z) => z.name === `${x.name}.${y.name}`
        );
        y.title = subQueryField.title;
      });
    }
  });

  return { columns, rows };
};
