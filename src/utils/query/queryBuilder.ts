/**
 * Get a stringified notation of a filter object
 *
 * @param filter The filter object
 * @returns The stringified filter
 */
const filterToString = (filter: any): string => {
  if (filter.filters) {
    return `{ logic: "${filter.logic}", filters: [${filter.filters.map(
      (x: any) => filterToString(x)
    )}]}`;
  } else {
    return `{ field: "${filter.field}", operator: "${filter.operator}", value: "${filter.value}" }`;
  }
};

/**
 * Gets the fields to be queried from a record field object arryay
 *
 * @param fields Record's fields
 * @returns An array of the fields to be queried
 */
const buildFields = (fields: any[]): any => {
  return ['id\n'].concat(
    fields.map((x) => {
      switch (x.kind) {
        case 'SCALAR': {
          return x.name + '\n';
        }
        case 'LIST': {
          return (
            `${x.name} (
            sortField: ${x.sort.field ? `"${x.sort.field}"` : null},
            sortOrder: "${x.sort.order}",
            filter: ${filterToString(x.filter)},
            first: ${x.first}
          ) {
            ${['canUpdate\ncanDelete\n'].concat(buildFields(x.fields))}
          }` + '\n'
          );
        }
        case 'OBJECT': {
          return (
            `${x.name} {
            ${buildFields(x.fields)}
          }` + '\n'
          );
        }
        default: {
          return '';
        }
      }
    })
  );
};

/**
 * Gets the meta fields to be queried from a record field object arryay
 *
 * @param fields Record's fields
 * @returns An array of the meta fields to be queried
 */
const buildMetaFields = (fields: any[]): any => {
  if (!fields) {
    return '';
  }
  return [''].concat(
    fields.map((x) => {
      switch (x.kind) {
        case 'SCALAR': {
          return x.name + '\n';
        }
        case 'LIST': {
          return (
            `${x.name} {
          ${x.fields && x.fields.length > 0 ? buildMetaFields(x.fields) : ''}
        }` + '\n'
          );
        }
        case 'OBJECT': {
          return (
            `${x.name} {
          ${x.fields && x.fields.length > 0 ? buildMetaFields(x.fields) : ''}
        }` + '\n'
          );
        }
        default: {
          return '';
        }
      }
    })
  );
};

/**
 * Build query to get total number of items to query
 *
 * @param query query definition
 * @returns Total count query
 */
export const buildTotalCountQuery = (query: any): any => {
  if (query) {
    const gqlQuery = `
      query GetCustomQuery($first: Int, $skip: Int, $filter: JSON, $sortField: String, $sortOrder: String, $display: Boolean) {
        ${query.name}(
        first: $first,
        skip: $skip,
        sortField: $sortField,
        sortOrder: $sortOrder,
        filter: $filter,
        display: $display
        ) {
          totalCount
      }
      }
    `;
    return gqlQuery;
  } else {
    return null;
  }
};

/**
 * Gets the GraphQL query from the query definition
 *
 * @param query The query object to be built
 * @returns The GraphQL query
 */
export const buildQuery = (query: any): any => {
  if (query && query.fields.length > 0) {
    const fields = ['canUpdate\ncanDelete\n'].concat(buildFields(query.fields));
    const gqlQuery = `
      query GetCustomQuery($first: Int, $skip: Int, $filter: JSON, $sortField: String, $sortOrder: String, $display: Boolean) {
        ${query.name}(
        first: $first,
        skip: $skip,
        sortField: $sortField,
        sortOrder: $sortOrder,
        filter: $filter,
        display: $display
        ) {
          edges {
            node {
              ${fields}
            }
          }
          totalCount
      }
      }
    `;
    return gqlQuery;
  } else {
    return null;
  }
};

/**
 * Gets the GraphQL meta query from the query definition
 *
 * @param query The query object to be built
 * @returns The GraphQL meta query
 */
export const buildMetaQuery = (query: any): any => {
  if (query && query.fields.length > 0) {
    const metaFields = buildMetaFields(query.fields);
    const gqlQuery = `
        query GetCustomMetaQuery {
          _${query.name}Meta {
            ${metaFields}
          }
        }
      `;
    return gqlQuery;
  } else {
    return null;
  }
};
