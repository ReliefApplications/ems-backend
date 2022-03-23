import { EmailPlaceholder } from '../../const/email';
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

// /**
//  * Builds a row of the email to open.
//  *
//  * @param item item to stringify.
//  * @param fields fields to use for query.
//  * @param tabs string indentation.
//  * @returns body of the email.
//  */
// const datasetRowToString = (item: any, fields: any, tabs = ''): string => {
//   let body = '';
//   for (const field of fields) {
//     switch (field.kind) {
//       case 'LIST':
//         body += `${tabs}${field.label ? field.label : field.name}:\n`;
//         const list = item ? item[field.name] || [] : [];
//         // eslint-disable-next-line @typescript-eslint/no-loop-func
//         list.forEach((element: any, index: number) => {
//           body += datasetRowToString(element, field.fields, tabs + '\t');
//           if (index < list.length - 1) {
//             body += `${tabs + '\t'}-----------------------\n`;
//           }
//         });
//         break;
//       case 'OBJECT':
//         body += `${tabs}${field.label ? field.label : field.name}:\n`;
//         body += datasetRowToString(
//           item ? item[field.name] : null,
//           field.fields,
//           tabs + '\t'
//         );
//         break;
//       default:
//         const value = get(item, field.name, '') || '';
//         if (value) {
//           body += `${tabs}${
//             field.label ? field.label : field.title ? field.title : field.name
//           }:\t${value}\n`;
//         }
//     }
//   }
//   return body;
// };

// /**
//  * Builds the body of the email to open.
//  *
//  * @param items list of items to stringify
//  * @param fields fields to use for query.
//  * @returns body of the email.
//  */
// const datasetToString = (items: any[], fields: any): string => {
//   let body = '';
//   // eslint-disable-next-line max-len
//   body +=
//     '--------------------------------------------------------------------------------------------------------------------------------\n';
//   for (const item of items) {
//     body += datasetRowToString(item, fields);
//     // eslint-disable-next-line max-len
//     body +=
//       '--------------------------------------------------------------------------------------------------------------------------------\n';
//   }
//   return body;
// };

/**
 * Builds a row of the email to open.
 *
 * @param item item to format.
 * @param fields fields to use metadata for formatting.
 * @returns html row to include in table.
 */
const datasetRowToHTML = (item: any, fields: any): string => {
  let row = '<tr>';
  for (const field of fields) {
    row += '<td>';
    switch (field.kind) {
      case 'LIST':
        // TO DO
        row += get(item, field.name, '') || '';
        break;
      case 'OBJECT':
        // TO DO
        row += get(item, field.name, '') || '';
        break;
      default:
        row += get(item, field.name, '') || '';
    }
    row += '</td>';
  }
  row += '</tr>';
  return row;
};

/**
 * Builds the body of the email to open.
 *
 * @param fields fields to for the label.
 * @param rows list of rows
 * @returns html table to include in body of the email.
 */
const datasetToHTML = (fields: any[], rows: any[]): string => {
  let table =
    '<table cellpadding="4" border="1px solid black" style="border-collapse: collapse;">';
  table += '<tr>';
  for (const field of fields) {
    table += '<th><b>';
    table += field.title ? field.title : field.name;
    table += '</b></th>';
  }
  table += '</tr>';
  for (const row of rows) {
    table += datasetRowToHTML(row, fields);
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
  if (text.includes(EmailPlaceholder.TODAY)) {
    const todayToString = new Date().toDateString();
    text = text.split(EmailPlaceholder.TODAY).join(todayToString);
  }

  // === NOW ===
  if (text.includes(EmailPlaceholder.NOW)) {
    const nowToString = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    text = text.split(EmailPlaceholder.NOW).join(nowToString);
  }

  // === DATASET ===
  if (text.includes(EmailPlaceholder.DATASET) && dataset) {
    if (dataset.fields.length > 0 && dataset.rows.length > 0) {
      const items: any = [...dataset.rows];
      convertDateFields(dataset.fields, items);
      const formattedDataSet = datasetToHTML(dataset.fields, items) || '';
      text = text.split(EmailPlaceholder.DATASET).join(formattedDataSet);
    } else {
      text = text.split(EmailPlaceholder.DATASET).join('');
    }
  }
  return text;
};
