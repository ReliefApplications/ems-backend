import { Resource } from '@models';

export type Field = {
  name: string;
  title: string;
  graphQLFieldName: string;
  choicesByUrl: boolean;
  choicesByGraphQL: boolean;
  isCalculated: boolean;
  expression: string;
  choices: { text: string; value: string }[];
};

export type FlatColumn = {
  name: string;
  title: string;
  field: string;
  index: number;
  subName?: string;
  subTitle?: string;
  subField?: string;
};

export type Column = {
  name?: string;
  title?: string;
  field: string;
  type?: string;
  parent?: Resource;
  displayField?: Column & { separator: string };
  subColumns: Column[];
  meta?: { field: Field };
};

/**
 * Gets export columns from meta query
 *
 * @param meta meta data query
 * @param fields list of fields
 * @param prefix object prefix, used for getting nested properties
 * @returns List of columns for export.
 */
export const getColumnsFromMeta = (
  meta: any,
  fields: any[],
  prefix?: string
): Column[] => {
  let columns = [];
  for (const key in meta) {
    const field = meta[key];
    if (field && field.name && typeof field.name === 'string') {
      // To get reference data fields
      const name = field.graphQLFieldName || field.name;
      // Classic field
      columns.push({
        name: prefix ? `${prefix}.${name}` : name,
        field: prefix ? `${prefix}.${name}` : name,
        type: field.type,
        meta: {
          field,
        },
      });
    } else {
      const queryField = fields.find((x) => x.name === key);
      if (queryField && queryField.subFields) {
        // List of related objects
        const fullName = prefix ? `${prefix}.${key}` : key;
        columns.push({
          name: fullName,
          field: fullName,
          type: 'resources',
          displayField: queryField.displayField
            ? {
                ...getColumnsFromMeta(field, [
                  {
                    name: queryField.displayField,
                  },
                ]).find((column) => column.name === queryField.displayField),
                separator: queryField.separator,
              }
            : null,
          subColumns:
            queryField.subFields.length > 0
              ? getColumnsFromMeta(field, queryField.subFields).map(
                  (subColumn) => {
                    const subField = queryField.subFields.find(
                      (_) => _.name === key + '.' + subColumn.name.split('.')[0]
                    );
                    return {
                      ...subColumn,
                      ...(subField?.displayField && {
                        displayField: {
                          ...subColumn.meta.field,
                          field: subColumn.meta.field.name,
                          separator: subField.separator,
                        },
                      }),
                    };
                  }
                )
              : [],
        });
      } else {
        // Single related object
        if (field)
          columns = columns.concat(
            getColumnsFromMeta(field, fields, prefix ? `${prefix}.${key}` : key)
          );
      }
    }
  }
  return columns;
};
