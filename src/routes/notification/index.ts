import express from 'express';
import { parse } from 'node-html-parser';
import { sendEmail } from '@utils/email';
import { logger } from '@services/logger.service';
import {
  EmailNotification,
  Record,
  Resource,
  emailNotificationSchema,
} from '@models';
import mongoose from 'mongoose';
import getFilter from '../../utils/schema/resolvers/Query/getFilter';
import {
  defaultRecordAggregation,
  emailAggregation,
  getFields,
  projectAggregation,
} from '@schema/query/dataSet.query';
import i18next from 'i18next';

/** Arguments for the dataSet query */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Args = {
  query: {
    resource: {
      id: mongoose.Schema.Types.ObjectId;
      name: string;
    };
    name: string;
    filter: { logic: string; filters: any[] };
    pageSize: number;
    fields?: any[];
    sort?: {
      field: string;
      order: string;
    };
    style: any[];
    tabIndex: number;
  };
};

/**
 *
 */
interface ProcessedDataset {
  name: string;
  records: any[];
  emails: string[];
  tableStyle: TableStyle;
}

/**
 *
 */
interface TableStyle {
  tableStyle: string;
  theadStyle: string;
  tbodyStyle: string;
  thStyle: string;
  trStyle: string;
  tdStyle: string;
  labelStyle: string;
  tableDivStyle: string;
}

/**
 * Send email using SMTP email client
 */
const router = express.Router();

// create a test object in database on hitting this endpoint
router.post('/create-data', async (req, res) => {
  const testNotification = mongoose.model(
    'EmailNotification',
    emailNotificationSchema
  );
  const testNotificationDocument = new testNotification({
    name: 'Test-Notification',
    notificationType: 'email',
    schedule: '* * * * *',
    dataSets: [
      {
        name: 'Test',
        resource: {
          id: '651a86667fd3c20309b16c3c',
          name: 'Events',
        },
      },
    ],
    recipientsType: 'email',
    status: 'active',
    lastExecutionStatus: 'success',
  });

  await testNotificationDocument.save();

  res.send('success');
});

/**
 * To replace all special characters with whitespace
 *
 * @param userValue The user's input value
 * @returns A string where all non-alphanumeric and non-hyphen characters are replaced with a whitespace.
 */
const replaceUnderscores = (userValue: string): string => {
  //Written by Hasnat L, reused
  return userValue ? userValue.replace(/[^a-zA-Z0-9-]/g, ' ') : '';
};

/**
 * Replaces dates of type Date with pretty string representation
 *
 * @param rowData data going into table, from DB
 * @returns mutated date
 */
const formatDates = (rowData: unknown): string => {
  if (rowData instanceof Date) {
    return rowData.toDateString();
  }
  return rowData as string;
};

/**
 * Converts a JSON array of records and a block name to a formatted HTML representation
 *
 * @param records dataset records
 * @param name dataset block name
 * @param styles tableStyles loaded from DB
 * @returns html table
 */
const buildTable = (records, name, styles: TableStyle): string => {
  const tableStyle =
    styles?.tableStyle ||
    `width: 100%; border-collapse: collapse; border: 1px solid gray; box-shadow: 0 0 #0000; overflow:auto;`;
  const trStyle =
    styles?.trStyle || `border-top: 1px solid gray; background-color: white;`;
  const thStyle =
    styles?.thStyle ||
    `text-align: left; padding: 2px; background-color: #00205C; color: white;`;
  const tdStyle = styles?.tdStyle || `padding: 2px; text-align: left;`;

  let table = `<table style="${tableStyle};">`;
  table += `<thead style="${styles.theadStyle}">`;
  table += `<tr style=${trStyle}>`;
  for (const key in records[0].data) {
    table += `<th style="${thStyle}">${replaceUnderscores(key)}</th>`;
  }
  table += '</tr></thead>';
  table += `<tbody style="${styles.tbodyStyle}"`;
  // Iterate over each record
  for (const record of records) {
    table += '<tr>';
    // Create a new cell for each field in the record
    for (const key in record.data) {
      table += `<td style="${tdStyle}">${formatDates(record.data[key])}</td>`;
    }
    table += '</tr>';
  }
  table += '</tbody>';
  table += '</table>';
  return `<div style="${styles?.tableDivStyle}">
    <label style="${styles?.labelStyle}">${name}</label>
    ${table}
  </div>`;
};

/**
 * Replaces block macros in body with tables
 *
 * @param bodyHtml Body of the email with macros to replace
 * @param processedRecords Datasets returned from DB and processed
 * @returns mutated string with replaced macro
 */
const replaceDatasets = async (
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
            processedDataSet.tableStyle
          )
        );
      }
    })
  );
  return bodyHtml;
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
const replaceHeader = (header: {
  headerStyle: string;
  headerHtml: string;
  headerHtmlStyle: string;
  headerLogo: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __zone_symbol__value: string;
  };
  headerLogoStyle: string;
}): string => {
  if (header.headerHtml) {
    const inthelastMatcher = new RegExp(
      '{{((?!today.date|now.datetime|now.time)[^{{|^}}]+)}}',
      'g'
    );
    const matches = header.headerHtml.matchAll(inthelastMatcher);
    for (const match of matches) {
      const splitToken = match[1].split('.');

      const now = Date.now();
      const withinTheLastMs = Number(splitToken[2]) * 60 * 1000;
      const dateLowerLimit = new Date(now - withinTheLastMs);

      const newHeader = `${splitToken[0]} records with ${replaceUnderscores(
        splitToken[1]
      )} from ${dateLowerLimit.toDateString()} as of ${new Date().toDateString()}`;
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
  }

  // Wraps the header elements in a div
  const headerElement = parse(`<div id="header">`, {
    blockTextElements: {
      style: true,
    },
  });
  if (header.headerLogo) {
    headerElement
      .getElementById('header')
      .appendChild(
        parse(
          `<img src="${header.headerLogo.__zone_symbol__value}" style="${header.headerLogoStyle}">`
        )
      );
  }

  // Inserts the header HTML
  if (header.headerHtml) {
    headerElement.getElementById('header').appendChild(
      parse(`<div id="headerHtml">${header.headerHtml || ''}</div>`, {
        blockTextElements: {
          style: true,
        },
      })
    );

    // Styles the header text
    if (header.headerHtmlStyle) {
      headerElement
        .getElementById('headerHtml')
        // .getElementsByTagName('p')[0]
        .setAttribute('style', header.headerHtmlStyle);
    }
  }

  headerElement.getElementById('header').appendChild(parse(`</div>`));

  headerElement
    .getElementById('header')
    .setAttribute('style', header.headerStyle);

  return headerElement.toString();
};

/**
 * Replaces macros in subject with values
 *
 * @param subject Subject of the email with field name macros to replace
 * @param records First table's records
 * @returns mutated string with replaced macro
 */
const replaceSubject = (subject: string, records: any[]): string => {
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
const replaceFooter = (footer: {
  footerStyle: string;
  footerHtml: string;
  footerHtmlStyle: string;
  footerLogo: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __zone_symbol__value: string;
  };
  footerLogoStyle: string;
}): string => {
  if (footer.footerHtml.includes('{{now.time}}')) {
    const nowToString = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    footer.footerHtml = footer.footerHtml.replace('{{now.time}}', nowToString);
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

  const footerElement = parse(`<div id="footer">`, {
    blockTextElements: {
      style: true,
    },
  });

  if (footer.footerLogo) {
    footerElement
      .getElementById('footer')
      .appendChild(
        parse(
          `<img id="footerLogo" src="${footer.footerLogo.__zone_symbol__value}" style="${footer.footerLogoStyle}">`
        )
      );
  }

  if (footer.footerHtml) {
    footerElement.getElementById('footer').appendChild(
      parse(`<div id="footerHtml">${footer.footerHtml}</div>`, {
        blockTextElements: {
          style: true,
        },
      })
    );

    if (footer.footerHtmlStyle) {
      footerElement
        .getElementById('footerHtml')
        .setAttribute('style', `${footer.footerHtmlStyle}`);
    }
  }

  footerElement.getElementById('footer').appendChild(parse(`</div>`));

  if (footer.footerStyle) {
    footerElement
      .getElementById('footer')
      .setAttribute('style', `${footer.footerStyle}`);
  }

  return footerElement.toString();
};

router.post('/send-email/:configId', async (req, res) => {
  try {
    const config = await EmailNotification.findById(req.params.configId);
    const datasets = config.get('dataSets');
    let emailHtml = '';

    const processedRecords: ProcessedDataset[] = [];

    await Promise.all(
      datasets.map(async (dataset) => {
        const filterLogic = dataset?.filter ?? {};
        const limit = 50;
        const fieldsList = getFields(dataset?.fields ?? [])?.fields;
        // const nestedFields = getFields(dataset?.fields ?? [])?.nestedField;
        const resource = await Resource.findOne({
          _id: dataset.resource.id,
        });

        if (!resource) {
          return res.status(404).send(req.t('common.errors.dataNotFound'));
        }
        const filters = getFilter(filterLogic, resource.fields);

        const projectFields: { [key: string]: number | string } = {};
        fieldsList.forEach((fieldData) => {
          if (
            fieldData.includes('createdAt') ||
            fieldData.includes('modifiedAt')
          ) {
            projectFields[fieldData] = `$${fieldData}`;
          } else if (
            fieldData.includes('createdBy') ||
            fieldData.includes('lastUpdatedBy')
          ) {
            const fieldName = fieldData.replaceAll('.', '_');
            projectFields[fieldName] = `$${fieldData}`;
          } else {
            projectFields[fieldData] = 1;
          }
        });

        const aggregations: any[] = [
          ...defaultRecordAggregation,
          {
            $match: {
              $and: [filters, { resource: resource._id }],
            },
          },
          ...emailAggregation,
          Object.keys(projectFields).length
            ? {
                $project: {
                  _id: 0,
                  modifiedAt: 1,
                  ...projectFields,
                  data: {
                    ...projectFields,
                  },
                  emailFields: 1,
                },
              }
            : {
                ...projectAggregation,
              },
          limit && { $limit: limit },
        ].filter(Boolean);
        const tempRecords = await Record.aggregate(aggregations);
        if (!tempRecords) {
          return res
            .status(403)
            .send(req.t('common.errors.permissionNotGranted'));
        }

        const emailList = [];
        const dataList = [];
        for (const data of tempRecords) {
          const emails = data.emailFields;
          if (emails.length) {
            emails.forEach((obj: { [key: string]: string }) => {
              emailList.push(obj.v);
              data.email = obj.v;
            });
          }
          delete data.emailFields;
          dataList.push(data);
        }
        processedRecords.push({
          name: dataset.name,
          records: tempRecords,
          emails: emailList,
          tableStyle: dataset.tableStyle,
        });
      })
    );

    emailHtml += `<div id="container" style="${config.emailLayout.banner.containerStyle}">`;

    if (config.emailLayout.banner.bannerImage) {
      emailHtml += `<img src="${config.emailLayout.banner.bannerImage.__zone_symbol__value}" style="${config.emailLayout.banner.bannerImageStyle}">`;
    }

    if (config.emailLayout.header.headerHtml) {
      emailHtml += replaceHeader(config.emailLayout.header);
    }

    const datasetsHtml = await replaceDatasets(
      config.emailLayout.body.bodyHtml,
      processedRecords
    );
    emailHtml += datasetsHtml;

    if (config.emailLayout.footer.footerHtml) {
      emailHtml += replaceFooter(config.emailLayout.footer);
    }

    emailHtml += `<div style="${config.emailLayout.banner.copyrightStyle}">
                    ${i18next.t('common.copyright.who')}
                  </div>`;

    emailHtml += '</div>';

    // TODO: Phase 2 - allow records from any table not just first
    const subjectRecords = processedRecords.find(
      (dataset) => dataset.name === config.dataSets[0].name
    ).records;

    const emailSubject = replaceSubject(
      config.get('emailLayout').subject,
      subjectRecords
    );

    //recipients
    const to = config.get('recipients').To;
    const cc = config.get('recipients').Cc;
    const bcc = config.get('recipients').Bcc;

    // Create email options
    const emailParams = {
      message: {
        to: to,
        cc: cc,
        bcc: bcc,
        subject: emailSubject,
        html: emailHtml,
      },
    };

    // Send email
    await sendEmail(emailParams);

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    logger.error(
      'send-email route handler - configuration query',
      err.message,
      { stack: err.stack }
    );
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
