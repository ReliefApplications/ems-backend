import { Placeholder } from '@const/placeholders';
import get from 'lodash/get';

/**
 * Transforms stored dates into readable dates.
 *
 * @param fields list of fields.
 * @param items list of items.
 */
const convertDateFields = (fields: any[], items: any[]): void => {
  const dateFields = fields
    .filter((x) => ['Date', 'DateTime', 'Time'].includes(x.type))
    .map((x) => x.name);
  items.map((x) => {
    for (const key of Object.keys(x)) {
      if (dateFields.includes(key)) {
        x[key] = x[key] && new Date(x[key]);
      }
    }
  });
};

/**
 * Convert a computed row to html
 *
 * @param temp temp row to add
 * @returns html row
 */
const tempToHTML = (temp: any[]): string => {
  let htmlRow = '';
  if (temp.filter((x) => x).length > 0) {
    htmlRow = '<tr>';
    for (const value of temp) {
      htmlRow += `<td style="border: 1px solid black;">${value}</td>`;
    }
    htmlRow += '</tr>';
  }
  return htmlRow;
};

/**
 * Builds a row of the email to open.
 *
 * @param row dataset row
 * @param flatColumns flat columns list
 * @returns html row to include in table.
 */
const datasetRowToHTML = (row: any, flatColumns: any): string => {
  const temp = [];
  let maxFieldLength = 0;
  for (const field of flatColumns) {
    if (field.subTitle) {
      const value = get(row, field.field, []);
      maxFieldLength = Math.max(maxFieldLength, value.length);
      temp.push('');
    } else {
      temp.push(get(row, field.field, null) || '');
    }
  }
  let html = '';
  if (maxFieldLength > 0) {
    for (let i = 0; i < maxFieldLength; i++) {
      for (const field of flatColumns) {
        if (field.subTitle) {
          const value = get(row, field.field, []);
          if (value && value.length > 0) {
            temp[field.index] =
              get(get(row, field.field, null)[i], field.subField, null) || '';
          } else {
            temp[field.index] = '';
          }
        } else {
          if (i !== 0) {
            temp[field.index] = '';
          }
        }
      }
      html += tempToHTML(temp);
    }
  } else {
    html += tempToHTML(temp);
  }
  return html;
};

/**
 * Builds the body of the email to open.
 *
 * @param columns list of columns
 * @param rows list of rows
 * @returns html table to include in body of the email.
 */
const datasetToHTML = (columns: any[], rows: any[]): string => {
  let index = -1;
  const flatColumns = columns.reduce((acc, value) => {
    if (value.subColumns) {
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
      index += 1;
      return acc.concat({
        name: value.name,
        title: value.title || value.name,
        field: value.field,
        index,
      });
    }
  }, []);
  let table =
    '<table cellpadding="4" style="border-collapse: collapse; border: 1px solid black;">';
  // Add header
  table += '<tr>';
  for (const column of columns) {
    const colspan = column.subColumns?.length || 1;
    table += `<th colspan="${colspan}" style="background-color: #008dc9; color: white; text-align: center; border: 1px solid black${
      column.width ? `; width: ${column.width}px` : ''
    }"><b>`;
    table += column.title;
    table += '</b></th>';
  }
  table += '</tr>';
  // Add subheader
  const subHeaderColumns = flatColumns.map((x: any) => x.subTitle || '');
  if (subHeaderColumns.filter((x: string) => x).length > 0) {
    table += '<tr>';
    for (const column of subHeaderColumns) {
      table +=
        '<th style="background-color: #999999; text-align: center; border: 1px solid black;"><b>';
      table += column;
      table += '</b></th>';
    }
    table += '</tr>';
  }
  for (const row of rows) {
    table += datasetRowToHTML(row, flatColumns);
  }
  table += '</table>';
  return table;
};

/**
 * Preprocesses text to replace keyword with corresponding data
 *
 * @param text text to preprocess.
 * @param dataset optional dataset settings.
 * @returns preprocessed string.
 */
export const preprocess = (
  text: string,
  dataset: {
    fields: any[];
    rows: any[];
  } | null = null
): string => {
  // === TODAY ===
  if (text.includes(Placeholder.TODAY)) {
    const todayToString = new Date().toDateString();
    text = text.split(Placeholder.TODAY).join(todayToString);
  }

  // === NOW ===
  if (text.includes(Placeholder.NOW)) {
    const nowToString = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    text = text.split(Placeholder.NOW).join(nowToString);
  }

  // === NOW ===
  if (text.includes(Placeholder.RECORD_ID)) {
    const textArray: string[] = [];
    dataset.rows.forEach((record: any) => textArray.push(record.id));
    text = textArray.join(', ');
  }

  // === DATASET ===
  if (text.includes(Placeholder.DATASET) && dataset) {
    if (dataset.fields.length > 0 && dataset.rows.length > 0) {
      const items: any = [...dataset.rows];
      convertDateFields(dataset.fields, items);
      const formattedDataSet = datasetToHTML(dataset.fields, items) || '';
      text =
        '<br>' +
        text.split(Placeholder.DATASET).join(formattedDataSet) +
        '<br>';
    } else {
      text = text.split(Placeholder.DATASET).join('');
    }
  }
  return text;
};
