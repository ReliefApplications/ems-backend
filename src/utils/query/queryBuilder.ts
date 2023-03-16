import { getGraphQLTypeName } from '../validators/validateName';
import { NameExtension } from '../schema/introspection/getFieldName';
import get from 'lodash/get';

/** ReferenceData GraphQL identifier convention */
const REFERENCE_DATA_END = getGraphQLTypeName(NameExtension.referenceData);

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
 * @param withId Boolean to add a default ID field.
 * @returns An array of the fields to be queried
 */
const buildFields = (fields: any[], withId = true): any => {
  const defaultField: string[] = withId ? ['id\n'] : [];
  return defaultField.concat(
    fields.map((x) => {
      switch (x.kind) {
        case 'SCALAR': {
          return x.name + '\n';
        }
        case 'LIST': {
          if (x.type.endsWith(REFERENCE_DATA_END)) {
            return (
              `${x.name} {
              ${buildFields(x.fields, false)}
            }` + '\n'
            );
          }
          return (
            `${x.name} (
            sortField: ${x.sort.field ? `"${x.sort.field}"` : null},
            sortOrder: "${x.sort.order}",
            first: ${get(x, 'first', null)}
            filter: ${filterToString(x.filter)},
          ) {
            ${['canUpdate\ncanDelete\n'].concat(buildFields(x.fields))}
          }` + '\n'
          );
        }
        case 'OBJECT': {
          return (
            `${x.name} {
            ${buildFields(x.fields, !x.type.endsWith(REFERENCE_DATA_END))}
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
