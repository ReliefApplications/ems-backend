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
      const label = fields?.find((data) => {
        const splitField = data.name.split('.');
        const fieldParts = field.name.split('.');
        if (splitField.length === fieldParts.length) {
          return splitField.every(
            (part: any, index: string | number) => part === fieldParts[index]
          );
        }
        return false;
      })?.label;
      // Classic field
      columns.push({
        name: prefix ? `${prefix}.${name}` : name,
        field: prefix ? `${prefix}.${name}` : name,
        type: field.type,
        meta: {
          field,
        },
        label,
      });
    } else {
      const queryField = fields.find((x) => x.name === key);
      if ((queryField && queryField.subFields) || queryField?.kind === 'LIST') {
        // List of related objects
        const fullName = prefix ? `${prefix}.${key}` : key;
        const subFields = queryField.subFields || queryField.fields;
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
            subFields.length > 0
              ? getColumnsFromMeta(field, subFields).map(
                  (subColumn) => {
                    const subField = subFields.find(
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
        columns = columns.concat(
          getColumnsFromMeta(
            field,
            queryField?.fields,
            prefix ? `${prefix}.${key}` : key
          )
        );
      }
    }
  }
  return columns;
};
