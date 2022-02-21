const filterToString = (filter: any): string => {
  if (filter.filters) {
    return `{ logic: "${filter.logic}", filters: [${filter.filters.map(
      (x: any) => filterToString(x)
    )}]}`;
  } else {
    return `{ field: "${filter.field}", operator: "${filter.operator}", value: "${filter.value}" }`;
  }
};

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
            filter: ${filterToString(x.filter)}
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
