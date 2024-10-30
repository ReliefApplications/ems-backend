import { inthelastDateLocale, timeLocale } from '@const/locale';
import { CustomTemplate } from '@models/customTemplate.model';
import {
  formatDates,
  titleCase,
  replaceUnderscores,
  replaceDateMacro,
  ProcessedDataset,
} from '@utils/notification/util';
import i18next from 'i18next';
import { parse, HTMLElement } from 'node-html-parser';

/**
 * Replaces macros in subject with values
 *
 * @param subject Subject of the email with field name macros to replace
 * @param records First table's records
 * @returns mutated string with replaced macro
 */
export const replaceSubject = (subject: string, records: any[]): string => {
  const subjectMatch = new RegExp(
    '{{((?!today.date|now.datetime|now.time)[^{{|^}}]+)}}',
    'g'
  );
  if (subject) {
    const matches = subject.matchAll(subjectMatch);

    for (const match of matches) {
      if (records[0][match[1]] != undefined && records[0][match[1]] != null) {
        subject = subject.replace(match[0], formatDates(records[0][match[1]]));
      } else {
        subject = subject.replace(match[0], '');
      }
    }
    subject = replaceDateMacro(subject);
  }
  return subject;
};

/**
 * Replaces macros in header with values
 *
 * @param header Header object returned from DB
 * @param header.headerStyle Header body styles
 * @param header.headerHtml Header HTML from TinyMCE
 * @param header.headerHtmlStyle Header text styles
 * @param header.headerLogo Header logo in base64 rep
 * @param header.headerLogoStyle Header logo styles
 * @param header.headerLogo.__zone_symbol__value Header logo in base64
 * @returns mutated string with replaced macro
 */
export const replaceHeader = (header: {
  headerStyle: string;
  headerHtml: string;
  headerHtmlStyle: string;
  headerLogo: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __zone_symbol__value: string;
  };
  headerLogoStyle: string;
}): string => {
  let headerString = `<table border="0" cellpadding="0" cellspacing="0" width="760px" style="padding: 10px;">
  <tbody>
  <tr>`;

  if (header.headerLogo) {
    headerString += `<td style="padding: 10px;">
          <a href="" style="display: block; border-style: none !important; text-align: center; border: 0 !important;">
              <img width="120" src="${header.headerLogo}" style="padding: 10px;max-width:unset" id="headerImage">
          </a>
      </td>
    `;
  }

  if (header.headerHtml) {
    const inthelastMatcher = new RegExp(
      '{{((?!today.date|now.datetime|now.time)[^{{|^}}]+)}}',
      'g'
    );
    const matches = header.headerHtml.matchAll(inthelastMatcher);
    for (const match of matches) {
      const splitToken = match[1].split('.');
      const currentDate = new Date();
      // Current date offset by minutes param
      const pastDate = new Date(
        currentDate.getTime() - Number(splitToken[2]) * 60000
      );

      const formattedPastDate = pastDate.toLocaleDateString(
        'en-US',
        inthelastDateLocale
      );

      // Past Date to time (hh:mm)
      const formattedPastTime = pastDate.toLocaleTimeString(
        'en-US',
        timeLocale
      );

      // Current Date to date (mm/dd/yyyy)
      const formattedCurrentDate = currentDate.toLocaleDateString(
        'en-US',
        inthelastDateLocale
      );

      // Current Date to time (hh:mm)
      const formattedCurrentTime = currentDate.toLocaleTimeString(
        'en-US',
        timeLocale
      );

      let newHeader;
      const minutesInAWeek = 7 * 24 * 60;
      if (Number(splitToken[2]) > minutesInAWeek) {
        newHeader = `From ${formattedPastDate} ${formattedCurrentTime} as of ${formattedCurrentDate} ${formattedCurrentTime}`;
      } else {
        newHeader = `From ${formattedPastDate} ${formattedPastTime} as of ${formattedCurrentDate} ${formattedCurrentTime}`;
      }
      header.headerHtml = header.headerHtml.replace(
        inthelastMatcher,
        newHeader
      );
    }

    header.headerHtml = replaceDateMacro(header.headerHtml);

    const headerPTags = header.headerHtml.split('<p>').filter(Boolean);
    const headerText = headerPTags
      .map((ptag) => {
        // Remove </p> tag from the end of the string
        const text = ptag.replace('</p>', '').trim();
        return /*html*/ `
        <td style="font-size: 16px; font-family: 'Roboto', Arial, sans-serif; line-height: 20px; text-align: center;">${text}</td>
      `;
      })
      .join('</tr><tr>'); // Join each table cell and add a table row between them

    headerString += `<td>
      <table cellpadding="0" cellspacing="0" width="760">
        <tbody>
          <tr>
            ${headerText}
          </tr>
        </tbody>
      </table>
    </td>`;
  }

  headerString += '</tr></tbody></table>';

  return headerString;
};

/**
 *  Function to calculate the maximum depth of subcolumns in a given set of columns.
 *
 * @param columns - An array of columns, where each column may have nested subcolumns.
 * @returns The maximum depth of nested subcolumns within the provided columns.
 */
const getMaxSubColumnDepth = (columns: any[]) => {
  let maxDepth = 1; // Start with depth 1 (top-level columns)
  let currentColumns = columns; // Start with the top-level columns

  while (currentColumns.some((column) => column.subColumns?.length)) {
    maxDepth += 1; // Increase the depth as we found subcolumns
    // Collect all subColumns at the current level
    currentColumns = currentColumns.flatMap(
      (column) => column.subColumns || []
    );
  }

  return maxDepth;
};

/**
 * Function to calculate the rowspan needed for a set of columns, considering the maximum depth of subcolumns.
 *
 * @param columns - An array of column objects, where each column may have nested subcolumns.
 * @param maxRowSpan - The maximum rowspan (depth) determined by the outermost function.
 * @returns The rowspan value for the columns, which indicates how many rows a top-level column should span.
 */
const getRowSpan = (columns, maxRowSpan) => {
  let rowSpan = maxRowSpan - 1;
  let currentColumns = columns;
  while (currentColumns.some((column) => column.subColumns?.length)) {
    rowSpan -= 1;
    currentColumns = currentColumns?.flatMap(
      (column) => column.subColumns || []
    );
  }
  return rowSpan;
};

/**
 * Function to calculate the colspan needed for a set of columns.
 *
 * @param columns - An array of column objects, where each column may have nested subcolumns.
 * @returns The colspan value, which indicates how many columns a top-level column should span.
 */
const getColSpan = (columns) => {
  let colSpan = columns?.length || 1;
  let currentColumns = columns;
  while (currentColumns.some((column) => column.subColumns?.length)) {
    for (const column of currentColumns) {
      if (column.subColumns?.length) {
        colSpan += column.subColumns.length - 1; // Add the subcolumns, minus 1 for the main column
      }
    }
    currentColumns = currentColumns?.flatMap(
      (column) => column.subColumns || []
    );
  }
  return colSpan;
};

/**
 * Function to calculate the maximum record length in a given dataset.
 *
 * @param record - A record object, which may contain nested arrays of data.
 * @param maxRecordsLength - The initial maximum record length.
 * @returns The maximum length of records, including nested arrays.
 */
const getMaxRecordLength = (record, maxRecordsLength) => {
  for (const value of Object.values(record)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object')
    ) {
      maxRecordsLength = Math.max(maxRecordsLength, value.length);
      let max = 0;
      value.forEach((data) => {
        for (const val of Object.values(data)) {
          if (
            Array.isArray(val) &&
            val.every((item) => typeof item === 'object')
          ) {
            max += getMaxRecordLength(data, 0);
          } else {
            // maxRecordsLength = Math.max(maxRecordsLength, value.length);
          }
        }
      });
      maxRecordsLength = Math.max(maxRecordsLength, max);
    }
  }
  return maxRecordsLength;
};

/**
 * Converts a JSON array of records and a block name to a formatted HTML representation
 *
 * @param dataset dataset records
 * @returns html table
 */
export const buildTable = (
  dataset: ProcessedDataset
  // styles
): string => {
  // // Styles to be used later on
  // // const tableStyle =
  // //   styles?.tableStyle ||
  // //   'width: 100%; border-collapse: collapse; border: 1px solid gray; box-shadow: 0 0 #0000; overflow:auto;';
  // // //const theadStyle = styles?.theadStyle || '';
  // // const tbodyStyle = styles?.tbodyStyle || '';
  // // const trStyle =
  // //   styles?.trStyle || 'border-top: 1px solid gray; background-color: white;';
  // // //const thStyle =
  // // //  styles?.thStyle ||
  // // //  'text-align: left; padding: 2px; background-color: #00205C; color: white;';
  // // const tdStyle = styles?.tdStyle || 'padding: 2px; text-align: left;';
  // // //const labelStyle = 'background-color: #00205C; color: white;';
  // // //const tableDivStyle = styles?.tableDivStyle || '';

  // THE FOLLOWING CSS SELECTORS ARE BANNED:
  // overflow, justify, display

  try {
    let table = '';
    //Checks if data is undefined
    if (!dataset.records[0]) {
      table = `<table  border="0" width="760" align="center" cellpadding="0" cellspacing="0" bgcolor="ffffff" >
      <tbody>
        <tr bgcolor="#00205c">
            <td mc:edit="title1" height="40" style="color: #fff; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; padding: 10px 20px;">
            ${dataset.name}</td>
        </tr>
        <tr>
          <td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px;">No data found</td>
        </tr>
      </tbody>
    </table>`;
    } else {
      table += `<table border="0" width="760" align="center" cellpadding="0" cellspacing="0"  >
                <tbody><tr bgcolor="#00205c">
                    <td mc:edit="title1" height="40" style="color: #fff; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; padding: 10px 20px;">
                    ${dataset.name}</td>
                </tr>
                <tr>
                    <td bgcolor="#fff" height="1"></td>
            </tr>
            </tbody>
            </table>`;
      table +=
        '<table bgcolor="ffffff" border="0" width="760" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 15px; border: 1px solid #d1d5db;">';
      table += '<thead>';
      table += '<tr bgcolor="#00205c">';
      const maxRowSpan = getMaxSubColumnDepth(dataset.columns);
      const subColumns = Array.from({ length: maxRowSpan }, () => []);
      dataset.columns.forEach((field) => {
        const rowSpan = field?.subColumns?.length
          ? getRowSpan(field.subColumns, maxRowSpan)
          : maxRowSpan;
        const colSpan = field?.subColumns?.length
          ? getColSpan(field.subColumns)
          : 1;
        table += `<th rowspan="${rowSpan}" colspan="${colSpan}" style="color: #fff; font-size: 14px;  font-family: 'Roboto', Arial, sans-serif; text-align: left; padding: 10px 20px;">${titleCase(
          replaceUnderscores(
            field.label ?? (typeof field === 'string' ? field : field.name)
          )
        )}</th>`;
        if (field?.subColumns?.length) {
          const addSubColumn = (columns, index, rowspan, maxRowspan) => {
            columns.forEach((column) => {
              if (column?.subColumns?.length) {
                const currentRowSpan = getRowSpan(
                  column?.subColumns,
                  maxRowspan - rowspan
                );
                const currentColSpan = getColSpan(column?.subColumns);
                subColumns[index].push(
                  `<th  rowspan="${currentRowSpan}" colspan="${currentColSpan}" style="color: #fff; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; text-align: left; padding: 10px 20px">${titleCase(
                    replaceUnderscores(
                      column.label ??
                        (typeof column === 'string' ? column : column.name)
                    )
                  )}</th>`
                );
                addSubColumn(
                  column?.subColumns,
                  Math.max(index, currentRowSpan) + 1,
                  currentRowSpan,
                  maxRowspan - 1
                );
              } else {
                subColumns[index].push(
                  `<th  rowspan="${
                    maxRowspan - rowspan
                  }" colspan="${1}" style="color: #fff; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; text-align: left; padding: 10px 20px">${titleCase(
                    replaceUnderscores(
                      column.label ??
                        (typeof column === 'string' ? column : column.name)
                    )
                  )}</th>`
                );
              }
            });
          };

          addSubColumn(field?.subColumns, rowSpan, rowSpan, maxRowSpan);
        }
      });
      if (subColumns.length) {
        subColumns.forEach((field) => {
          if (field.length) {
            table += '</tr><tr bgcolor="#00205c">';
            for (const column of field) {
              table += column;
            }
          }
        });
      }

      table += '</tr></thead>';
      table += '<tbody>';
      // Iterate over each record
      for (const record of dataset.records) {
        table += '<tr>';
        let maxRecordsLength = 1;
        maxRecordsLength = getMaxRecordLength(record, maxRecordsLength);
        const subRows = Array.from({ length: maxRecordsLength }, () => []);
        // Create a new cell for each field in the record

        for (const column of dataset.columns) {
          const columnData = record[column.name] as any;
          if (
            Array.isArray(columnData) &&
            columnData?.length &&
            columnData.every((item) => typeof item === 'object')
          ) {
            for (let i = 0; i < maxRecordsLength; i++) {
              if (columnData[i]) {
                for (const subColumn of column?.subColumns) {
                  const data = (subColumn as any)?.name
                    ?.split('.')
                    ?.reduce((acc, key) => acc && acc[key], columnData[i]);
                  subRows[i]
                    .push(`<td rowspan="${1}" style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(data)}</td>`);
                }
              } else {
                subRows[i].push(
                  `<td colspan="${
                    column?.subColumns?.length || 1
                  }" style = "color: #000;  font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
            </td>`
                );
              }
            }
          } else {
            subRows[0].push(`<td rowspan="${
              maxRecordsLength > 0 ? maxRecordsLength : 1
            }" colspan="${
              column?.subColumns?.length || 1
            }" style = "color: #000;  font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(columnData)}</td>`);
          }
        }
        table += '</tr>';
        // table += '</tr>';
        if (subRows.length) {
          for (const subrow of subRows) {
            table += '<tr>';
            for (const row of subrow) {
              table += row;
            }
            table += '</tr>';
          }
        }
      }
      table += '</tbody>';
      table += '</table>';
    }
    // TODO: Replace overflow
    return table;
  } catch (error) {
    return '<table><tr><td>Error while generating table - Please contact support</td></tr></table>';
  }
};

/**
 * Replaces block macros in body with tables
 *
 * @param bodyHtml Body of the email with macros to replace
 * @param processedRecords Datasets returned from DB and processed
 * @returns mutated string with replaced macro
 */
export const replaceDatasets = async (
  bodyHtml: string,
  processedRecords: ProcessedDataset[]
): Promise<string> => {
  if (bodyHtml) {
    await Promise.all(
      processedRecords.map(async (processedDataSet) => {
        if (bodyHtml.includes(`{{${processedDataSet.name}}}`)) {
          bodyHtml = bodyHtml.replaceAll(
            `{{${processedDataSet.name}}}`,
            buildTable(processedDataSet)
          );
        }
      })
    );
  } else {
    return '';
  }
  return bodyHtml;
};

/**
 * Replaces macros in footer with values
 *
 * @param footer Footer object returned from DB
 * @param footer.footerStyle Footer styles
 * @param footer.footerHtml Footer HTML from TinyMCE
 * @param footer.footerHtmlStyle Footer text styles
 * @param footer.footerLogo Footer logo in base64 rep
 * @param footer.footerLogoStyle Footer logo styles
 * @param footer.footerLogo.__zone_symbol__value Footer logo in base64
 * @returns mutated string with replaced macro
 */
export const replaceFooter = (footer: {
  footerStyle: string;
  footerHtml: string;
  footerHtmlStyle: string;
  footerLogo: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __zone_symbol__value: string;
  };
  footerLogoStyle: string;
}): string => {
  let footerString = `<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tbody>
    <tr>`;

  //footerString += `<table><tbody><tr>`;

  if (footer.footerLogo) {
    footerString += `
      <td style="padding: 10px;">
          <a href="" style="display: block; border-style: none !important; text-align: center; border: 0 !important;">
              <img width="120" src="${footer.footerLogo}" style="padding: 10px;" id="footerImage">
          </a>
      </td>
      `;
  }

  if (footer.footerHtml) {
    footer.footerHtml = replaceDateMacro(footer.footerHtml);

    const footerPTags = footer.footerHtml.split('<p>').filter(Boolean);
    const footerText = footerPTags
      .map((ptag) => {
        const text = ptag.replace('</p>', '').trim();
        return /*html*/ `
            <td style="font-size: 14px; font-family: 'Roboto', Arial, sans-serif; line-height: 20px;"> ${text} </td>
        `;
      })
      .join('</tr><tr>');

    footerString += `<td>
    <table width="100%">
      <tbody>
        <tr>
          ${footerText}
        </tr>
      </tbody>
    </table>
  </td>`;
  }

  footerString += '</tr></tbody></table>';

  return footerString;
};

/**
 * Mutates mainTableElement to contain templates from config with data
 *
 * @param emailLayout config for email layout
 * @param mainTableElement Blank table element for the email body
 * @param records Fetched records to insert into email
 */
export const buildEmail = async (
  emailLayout: CustomTemplate,
  mainTableElement: HTMLElement,
  records: any[]
): Promise<HTMLElement> => {
  // Add banner image
  if (emailLayout.banner.bannerImage) {
    const bannerElement = parse(
      `<tr bgcolor="#fff" align="center">
          <td>
            <a href="#" style="display: block; border-style: none !important; border: 0 !important;">
              <img width="800px" src="${emailLayout.banner.bannerImage}" style="padding: 10px;" id="bannerImage">
            </a>
          </td>
       </tr>`
    );
    mainTableElement.appendChild(bannerElement);
  }

  // Add header
  if (emailLayout.header) {
    const headerElement = replaceHeader(emailLayout.header);
    const backgroundColor =
      emailLayout.header.headerBackgroundColor || '#00205c';
    const textColor = emailLayout.header.headerTextColor || '#ffffff';
    mainTableElement.appendChild(
      parse(
        `<tr bgcolor = ${backgroundColor} color = ${textColor}><td style="font-size: 13px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">${headerElement}</td></tr>`
      )
    );
  }

  mainTableElement.appendChild(
    parse(`<tr>
              <td height="25"></td>
          </tr>`)
  );
  // Add body
  if (emailLayout.body) {
    const datasetsHtml = await replaceDatasets(
      emailLayout.body.bodyHtml,
      records
    );
    const backgroundColor = emailLayout.body.bodyBackgroundColor || '#ffffff';
    const textColor = emailLayout.body.bodyTextColor || '#000000';
    mainTableElement.appendChild(
      parse(
        `<tr bgcolor = ${backgroundColor} color = ${textColor}><td style="color:${textColor}">${datasetsHtml}</td></tr>`
      )
    );
  }

  // Add footer
  if (emailLayout.footer) {
    const footerElement = replaceFooter(emailLayout.footer);
    const backgroundColor =
      emailLayout.footer.footerBackgroundColor || '#ffffff';
    const textColor = emailLayout.footer.footerTextColor || '#000000';
    mainTableElement.appendChild(
      parse(
        `<tr bgcolor= ${backgroundColor}><td style="font-size: 13px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">${footerElement}</td></tr>`
      )
    );
  }

  // // Add copyright
  mainTableElement.appendChild(
    parse(/*html*/ `
    <tr bgcolor="#00205c">
      <td mc:edit="footer1" style="font-size: 12px; color: #fff; font-family: 'Roboto', Arial, sans-serif; text-align: center; padding: 8px;">
        ${i18next.t('common.copyright.who')}
      </td>
    </tr>`)
  );
  return mainTableElement;
};

/**
 * Build HTML table from dataset fields and data list.
 *
 * @param fields - Array of dataset fields
 * @param dataList - Array of data objects
 * @returns HTML string representing the table
 */
export const buildTableHtml = (fields: string[], dataList: any[]) => {
  let tableHtml =
    '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
  tableHtml += '<thead><tr>';

  // Add table headers
  fields.forEach((field) => {
    tableHtml += `<th>${titleCase(replaceUnderscores(`${field}`))}</th>`;
  });

  tableHtml += '</tr></thead>';
  tableHtml += '<tbody>';

  // Add table rows
  dataList.forEach((data) => {
    tableHtml += '<tr>';
    fields.forEach((field) => {
      const value = Array.isArray(data[field])
        ? data[field].join(', ')
        : data[field] || '';
      tableHtml += `<td>${value}</td>`;
    });
    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
};
