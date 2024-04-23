import { ProcessedDataset, TableStyle } from '@routes/notification';
import {
  formatDates,
  titleCase,
  replaceUnderscores,
} from '@utils/notification/util';
import _ from 'lodash';

/**
 * Fieldset object
 */
interface FieldStore {
  name: string;
  type: string;
  fields?: string[] | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __typename: string;
  parentName?: string | null;
  childName?: string | null;
  childType?: string | null;
}

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
      if (records[0].data[match[1]]) {
        subject = subject.replace(match[0], records[0].data[match[1]]);
      }
      if (records[0][match[1]]) {
        // For metafields (createdAt, modifiedAt)
        if (records[0][match[1]] instanceof Date) {
          subject = subject.replace(
            match[0],
            (records[0][match[1]] as Date).toDateString()
          );
        }
      }
    }

    if (subject.includes('{{now.time}}')) {
      const nowToString = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      subject = subject.replace('{{now.time}}', nowToString);
    }
    if (subject.includes('{{now.datetime}}')) {
      const nowToString = new Date().toLocaleString();
      subject = subject.replace('{{now.datetime}}', nowToString);
    }

    if (subject.includes('{{today.date}}')) {
      const todayToString = new Date().toDateString();
      subject = subject.replace('{{today.date}}', todayToString);
    }
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
              <img width="120" data-imagetype="DataUri"  src="cid:headerImage" style="padding: 10px;">
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

      // Past Date to date (mm/dd/yyyy)
      const formattedPastDate = pastDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });

      // Past Date to time (hh:mm)
      const formattedPastTime = pastDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Current Date to date (mm/dd/yyyy)
      const formattedCurrentDate = currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });

      // Current Date to time (hh:mm)
      const formattedCurrentTime = currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      let newHeader;
      const minutesInAWeek = 7 * 24 * 60;
      if (Number(splitToken[2]) > minutesInAWeek) {
        newHeader = `From ${formattedPastDate} ${formattedCurrentTime} UTC as of ${formattedCurrentDate} ${formattedCurrentTime} UTC`;
      } else {
        newHeader = `From ${formattedPastDate} ${formattedPastTime} UTC as of ${formattedCurrentDate} ${formattedCurrentTime} UTC`;
      }
      header.headerHtml = header.headerHtml.replace(
        inthelastMatcher,
        newHeader
      );
    }

    if (header.headerHtml.includes('{{now.time}}')) {
      const nowToString = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      header.headerHtml = header.headerHtml.replace(
        '{{now.time}}',
        nowToString
      );
    }
    if (header.headerHtml.includes('{{now.datetime}}')) {
      const nowToString = new Date().toLocaleString();
      header.headerHtml = header.headerHtml.replace(
        '{{now.datetime}}',
        nowToString
      );
    }
    if (header.headerHtml.includes('{{today.date}}')) {
      const todayToString = new Date().toDateString();
      header.headerHtml = header.headerHtml.replace(
        '{{today.date}}',
        todayToString
      );
    }

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
      <table border="0" cellpadding="0" cellspacing="0" width="760">
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
 * Converts a JSON array of records and a block name to a formatted HTML representation
 *
 * @param records dataset records
 * @param name dataset block name
 * @param styles tableStyles loaded from DB
 * @param fieldList fieldList loaded from DB
 * @param fieldSet fieldSet loaded from graphql call
 * @returns html table
 */
export const buildTable = (
  records,
  name,
  styles: TableStyle,
  fieldList: string[],
  fieldSet?: FieldStore[]
): string => {
  // Styles to be used later on
  // const tableStyle =
  //   styles?.tableStyle ||
  //   'width: 100%; border-collapse: collapse; border: 1px solid gray; box-shadow: 0 0 #0000; overflow:auto;';
  // //const theadStyle = styles?.theadStyle || '';
  // const tbodyStyle = styles?.tbodyStyle || '';
  // const trStyle =
  //   styles?.trStyle || 'border-top: 1px solid gray; background-color: white;';
  // //const thStyle =
  // //  styles?.thStyle ||
  // //  'text-align: left; padding: 2px; background-color: #00205C; color: white;';
  // const tdStyle = styles?.tdStyle || 'padding: 2px; text-align: left;';
  // //const labelStyle = 'background-color: #00205C; color: white;';
  // //const tableDivStyle = styles?.tableDivStyle || '';

  // THE FOLLOWING CSS SELECTORS ARE BANNED:
  // overflow, justify, display

  let table = '';
  //Checks if data is undefined
  if (!records[0] || !records[0].data) {
    table = `
    <table  border="0" width="760" align="center" cellpadding="0" cellspacing="0" bgcolor="ffffff" >
      <tbody>
        <tr bgcolor="#00205c">
            <td mc:edit="title1" height="40" style="color: #fff; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; padding-left: 10px;">
            ${name}</td>
        </tr>
        <tr>
          <td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px;">No data found</td>
        </tr>
      </tbody>
    </table>`;
  } else {
    table += `<table border="0" width="760" align="center" cellpadding="0" cellspacing="0"  >
                <tbody><tr bgcolor="#00205c">
                    <td mc:edit="title1" height="40" style="color: #fff; font-size: 15px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif; padding-left: 10px;">
                    ${name}</td>
                </tr>
                <tr>
                    <td bgcolor="#fff" height="5"></td>
            </tr>
            </tbody>
            </table>`;
    table +=
      '<table bgcolor="ffffff" border="0" width="760" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto; border: 1px solid black;">';
    table += '<thead>';
    table += '<tr bgcolor="#00205c">';
    fieldSet.forEach((field) => {
      table += `<th align="left" style="color: #fff; font-size: 14px; font-family: 'Roboto', Arial, sans-serif; padding-left: 10px">${titleCase(
        replaceUnderscores(`${field.name}`)
      )}</th>`;
    });

    table += '</tr></thead>';
    table += '<tbody>';
    // Iterate over each record
    for (const record of records) {
      table += '<tr>';
      // Create a new cell for each field in the record
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      fieldSet.forEach((field) => {
        if (field.parentName) {
          if (
            field.childName === 'incrementalId' ||
            field.childName === 'form' ||
            field.childName === 'id' ||
            field.childName === 'lastUpdateForm' ||
            field.childName === 'createdAt' ||
            field.childName === 'modifiedAt'
          ) {
            table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(
            _.get(record.data[`${field.parentName}`], field.childName)
          )}</td>`;
          } else if (
            field.childName.split('.')[0] === '_createdBy' ||
            field.childName.split('.')[0] === '_lastUpdatedBy'
          ) {
            table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
            ${formatDates(
              _.get(record.data[`${field.parentName}`], field.childName)
            )}</td>`;
          } else {
            table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
            ${formatDates(
              record.data[field.parentName]?.data[field.childName]
            )}</td>`;
          }
        } else if (field.type === 'resources') {
          table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${record.data[field.name]?.length} items</td>`;
        } else if (
          field.name.split('.')[0] === '_createdBy' ||
          field.name.split('.')[0] === '_lastUpdatedBy'
        ) {
          table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(_.get(record.data, field.name))}</td>`;
        } else if (
          field.name === 'incrementalId' ||
          field.name === 'id' ||
          field.name === 'form' ||
          field.name === 'lastUpdateForm'
        ) {
          table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(_.get(record, field.name))}</td>`;
        } else if (field.type === 'geospatial') {
          table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(
            record.data[field.name].properties.countryName
          )} (${formatDates(
            record.data[field.name].properties.coordinates.lat
          )}, ${formatDates(
            record.data[field.name].properties.coordinates.lng
          )}</td>`;
        } else {
          table += `<td  style = "color: #000; font-size: 15px; font-family: 'Roboto', Arial, sans-serif; padding-left: 20px; padding-top: 8px;padding-bottom: 8px; border-bottom:1px solid #d1d5db;">
          ${formatDates(record.data[field.name])}</td>`;
        }
      });
      table += '</tr>';
    }
    table += '</tbody>';
    table += '</table>';
  }
  // TODO: Replace overflow
  return table;
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
  await Promise.all(
    processedRecords.map(async (processedDataSet) => {
      if (bodyHtml.includes(`{{${processedDataSet.name}}}`)) {
        bodyHtml = bodyHtml.replace(
          `{{${processedDataSet.name}}}`,
          buildTable(
            processedDataSet.records,
            processedDataSet.name,
            processedDataSet.tableStyle,
            processedDataSet.fields,
            processedDataSet.fieldSet
          )
        );
      }
    })
  );
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
  let footerString = `<table border="0" cellpadding="0" cellspacing="0">
    <tbody>
    <tr>`;

  //footerString += `<table><tbody><tr>`;

  if (footer.footerLogo) {
    footerString += `
      <td style="padding: 10px;">
          <a href="" style="display: block; border-style: none !important; text-align: center; border: 0 !important;">
              <img width="120" data-imagetype="DataUri"  src="cid:footerImage" style="padding: 10px; background-color: white;">
          </a>
      </td>
      `;
  }

  if (footer.footerHtml) {
    if (footer.footerHtml.includes('{{now.time}}')) {
      const nowToString = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      footer.footerHtml = footer.footerHtml.replace(
        '{{now.time}}',
        nowToString
      );
    }
    if (footer.footerHtml.includes('{{now.datetime}}')) {
      const nowToString = new Date().toLocaleString();
      footer.footerHtml = footer.footerHtml.replace(
        '{{now.datetime}}',
        nowToString
      );
    }
    if (footer.footerHtml.includes('{{today.date}}')) {
      const todayToString = new Date().toDateString();
      footer.footerHtml = footer.footerHtml.replace(
        '{{today.date}}',
        todayToString
      );
    }
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
    <table>
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
