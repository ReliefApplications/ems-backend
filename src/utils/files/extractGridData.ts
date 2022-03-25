import { buildQuery, buildMetaQuery } from '../query/queryBuilder';
import { getColumnsFromMeta, getRowsFromMeta } from '.';
import fetch from 'node-fetch';
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
  token: string,
): Promise<{ columns: any[]; rows: any[] }> => {
  const query = buildQuery(params.query);
  const metaQuery = buildMetaQuery(params.query);

  let records: any[] = [];
  let meta: any;

  const gqlQuery = fetch('http://localhost:3000/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: query,
      variables: {
        first: 5000,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
        filter: params.filter,
        display: true,
      },
    }),
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  })
    .then((x) => x.json())
    .then((y) => {
      for (const field in y.data) {
        if (Object.prototype.hasOwnProperty.call(y.data, field)) {
          records = y.data[field].edges.map((x) => x.node);
        }
      }
    });

  const gqlMetaQuery = fetch('http://localhost:3000/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: metaQuery,
    }),
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
  })
    .then((x) => x.json())
    .then((y) => {
      for (const field in y.data) {
        if (Object.prototype.hasOwnProperty.call(y.data, field)) {
          meta = y.data[field];
        }
      }
    });

  await Promise.all([gqlQuery, gqlMetaQuery]);

  const rawColumns = getColumnsFromMeta(meta);
  const columns = rawColumns.filter((x) =>
    params.fields.find((y) => y.name === x.name),
  );
  const rows = await getRowsFromMeta(columns, records);

  // Edits the column to match with the fields
  columns.forEach(
    (x) => (x.title = params.fields.find((y) => y.name === x.name).title),
  );

  return { columns, rows };
};
