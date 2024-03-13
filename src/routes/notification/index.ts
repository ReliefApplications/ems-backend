import express from 'express';
import { parse } from 'node-html-parser';
import { sendEmail } from '@utils/email';
import { logger } from '@services/logger.service';
import { EmailNotification, Record, Resource } from '@models';
import getFilter from '../../utils/schema/resolvers/Query/getFilter';
import {
  defaultRecordAggregation,
  emailAggregation,
  getFields,
  projectAggregation,
} from '@schema/query/dataSet.query';
import i18next from 'i18next';
import {
  buildTable,
  replaceDatasets,
  replaceFooter,
  replaceHeader,
  replaceSubject,
} from '@utils/notification/htmlBuilder';

/**
 *
 */
export interface ProcessedDataset {
  name: string;
  records: any[];
  emails: string[];
  tableStyle: TableStyle;
}

/**
 * Interface for processing datasets for separate emails
 */
export interface ProcessedIndividualDataset {
  name: string;
  record: {
    data: any;
    emails: string;
  };
  tableStyle: TableStyle;
}

/**
 *
 */
export interface TableStyle {
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

router.post('/send-email/:configId', async (req, res) => {
  try {
    const config = await EmailNotification.findById(req.params.configId);
    const datasets = config.get('dataSets');
    const emailElement = parse(`<!DOCTYPE HTML>
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0;">
        <title>EMSPOC - Email Alert</title>
    </head>
    
    <body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="width: 100%; background-color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table border="0" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td height="30"></td>
            </tr>
            <tr bgcolor="#4c4e4e">
                <td width="100%" align="center" valign="top" bgcolor="#ffffff">
                    <!----------   main content----------->
                    <table id="mainTable" width="800" style="border: 3px solid #00205c; margin: 0 auto;" cellpadding="0" cellspacing="0" bgcolor="#fff">
                        
                    </table>
                    <!----------   end main content----------->
                </td>
            </tr>
        </table>
    </body>
    
    </html>`);

    const mainTableElement = emailElement.getElementById('mainTable');

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
        //console.dir(tempRecords, { depth: null });
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

    if (config.emailLayout.banner.bannerImage) {
      const bannerElement = parse(
        `<tr bgcolor="#fff" align="center">
            <td>
              <a href="#" style="display: block; border-style: none !important; border: 0 !important;">
                  <img width="100%" data-imagetype="DataUri" src="cid:bannerImage" alt="logo">
              </a>
            </td>
         </tr>`
      );
      mainTableElement.appendChild(bannerElement);
    }

    if (config.emailLayout.header) {
      const headerElement = parse(replaceHeader(config.emailLayout.header));
      mainTableElement.appendChild(headerElement);
    }

    mainTableElement.appendChild(
      parse(`<tr>
                <td height="25"></td>
            </tr>`)
    );

    const datasetsHtml = await replaceDatasets(
      config.emailLayout.body.bodyHtml,
      processedRecords
    );
    mainTableElement.appendChild(parse(`<tr><td>${datasetsHtml}</td></tr>`));

    if (config.emailLayout.footer) {
      const footerElement = replaceFooter(config.emailLayout.footer);
      mainTableElement.appendChild(
        parse(
          `<tr><td style="font-size: 13px; font-family: Helvetica, Arial, sans-serif;">${footerElement}</td></tr>`
        )
      );
    }

    mainTableElement.appendChild(
      parse(/*html*/ `
      <tr bgcolor="#00205c">
        <td mc:edit="footer1" style="font-size: 12px; color: #fff; font-family: 'Roboto', Arial, sans-serif; text-align: center; padding: 0 10px;">
          ${i18next.t('common.copyright.who')}
        </td>
      </tr>`)
    );

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
    const attachments: { path: string; cid: string }[] = [];
    // Use base64 encoded images as path for CID attachments
    // This is required for images to render in the body on legacy clients
    if (config.emailLayout.header.headerLogo) {
      attachments.push({
        path: config.emailLayout.header.headerLogo.__zone_symbol__value,
        cid: 'headerImage',
      });
    }
    if (config.emailLayout.footer.footerLogo) {
      attachments.push({
        path: config.emailLayout.footer.footerLogo.__zone_symbol__value,
        cid: 'footerImage',
      });
    }
    if (config.emailLayout.banner.bannerImage) {
      attachments.push({
        path: config.emailLayout.banner.bannerImage.__zone_symbol__value,
        cid: 'bannerImage',
      });
    }

    // Create email options
    const emailParams = {
      message: {
        to: to,
        cc: cc,
        bcc: bcc,
        subject: emailSubject,
        html: emailElement.toString(),
        attachments: attachments,
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

/**
 * POST request for sending separate emails.
 * On a selected boolean flag the dataset is sliced and send independently by row to each email in the distribution list
 */
router.post('/send-individual-email/:configId', async (req, res) => {
  try {
    const config = await EmailNotification.findById(req.params.configId);
    const datasets = config.get('dataSets');
    let emailElement = parse(`<!DOCTYPE HTML>
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0;">
        <title>EMSPOC - Email Alert</title>
    </head>
    
    <body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="width: 100%; background-color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table border="0" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td height="30"></td>
            </tr>
            <tr bgcolor="#4c4e4e">
                <td width="100%" align="center" valign="top" bgcolor="#ffffff">
                    <!----------   main content----------->
                    <table id="mainTable" width="800" style="border: 3px solid #00205c; margin: 0 auto;" cellpadding="0" cellspacing="0" bgcolor="#fff">
                        
                    </table>
                    <!----------   end main content----------->
                </td>
            </tr>
        </table>
    </body>
    
    </html>`);

    const mainTableElement = emailElement.getElementById('mainTable');
    const processedRecords: ProcessedIndividualDataset[] = [];

    const processedBlockRecords: ProcessedDataset[] = [];

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

        // console.dir(aggregations, { depth: null });
        const tempRecords = await Record.aggregate(aggregations);
        //console.dir(tempRecords, { depth: null });
        if (!tempRecords) {
          return res
            .status(403)
            .send(req.t('common.errors.permissionNotGranted'));
        }

        if (dataset.individualEmail) {
          const emailList = [];
          const dataList = [];
          for (const data of tempRecords) {
            const emails = data.emailFields;
            if (emails.length) {
              emails.forEach((obj: { [key: string]: string }) => {
                emailList.push(obj.v);
                data.email = obj.v;
                processedRecords.push({
                  name: dataset.name,
                  record: { data: data, emails: obj.v },
                  tableStyle: dataset.tableStyle,
                });
              });
            }
            delete data.emailFields;
            dataList.push(data);
          }
        } else {
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
          processedBlockRecords.push({
            name: dataset.name,
            records: tempRecords,
            emails: emailList,
            tableStyle: dataset.tableStyle,
          });
        }
      })
    );

    if (config.emailLayout.banner.bannerImage) {
      const bannerElement = parse(
        `<tr bgcolor="#fff" align="center">
            <td>
              <a href="#" style="display: block; border-style: none !important; border: 0 !important;">
                  <img width="100%" data-imagetype="DataUri" src="cid:bannerImage" alt="logo">
              </a>
            </td>
         </tr>`
      );
      mainTableElement.appendChild(bannerElement);
    }

    if (config.emailLayout.header) {
      const headerElement = parse(replaceHeader(config.emailLayout.header));
      mainTableElement.appendChild(headerElement);
    }

    // Add body div
    const bodyDiv = parse('<div id="body"></div>');
    mainTableElement.appendChild(bodyDiv);
    let bodyString = await replaceDatasets(
      config.emailLayout.body.bodyHtml,
      processedBlockRecords
    );
    mainTableElement.appendChild(parse(`<tr><td>${bodyString}</td></tr>`));

    // containerDiv.appendChild(datasetsHtml);

    if (config.emailLayout.footer) {
      const footerElement = replaceFooter(config.emailLayout.footer);
      mainTableElement.appendChild(parse(footerElement));
    }

    mainTableElement.appendChild(
      parse(/*html*/ `
      <tr bgcolor="#00205c">
        <td mc:edit="footer1" style="font-size: 12px; color: #fff; font-family: 'Roboto', Arial, sans-serif; text-align: center; padding: 0 10px;">
          ${i18next.t('common.copyright.who')}
        </td>
      </tr>`)
    );

    //TODO: Phase 2 - allow records from any table not just first
    const subjectRecords = processedRecords.find(
      (dataset) => dataset.name === config.dataSets[0].name
    ).record;

    const emailSubject = replaceSubject(config.get('emailLayout').subject, [
      subjectRecords,
    ]);

    const bodyElement = mainTableElement.getElementById('body');

    const cc = config.get('recipients').Cc;
    const bcc = config.get('recipients').Bcc;
    const attachments: { path: string; cid: string }[] = [];
    // Use base64 encoded images as path for CID attachments
    // This is required for images to render in the body on legacy clients
    if (config.emailLayout.header.headerLogo) {
      attachments.push({
        path: config.emailLayout.header.headerLogo.__zone_symbol__value,
        cid: 'headerImage',
      });
    }
    if (config.emailLayout.footer.footerLogo) {
      attachments.push({
        path: config.emailLayout.footer.footerLogo.__zone_symbol__value,
        cid: 'footerImage',
      });
    }
    if (config.emailLayout.banner.bannerImage) {
      attachments.push({
        path: config.emailLayout.banner.bannerImage.__zone_symbol__value,
        cid: 'bannerImage',
      });
    }

    for (const block of processedRecords) {
      // let bodyHtml = config.emailLayout.body.bodyHtml;
      const bodyStringCopy = bodyString;
      if (bodyString.includes(`{{${block.name}}}`)) {
        bodyString = bodyString.replace(
          `{{${block.name}}}`,
          buildTable([block.record.data], block.name, block.tableStyle)
        );
      }

      const bodyBlock = parse(bodyString);

      bodyElement.appendChild(bodyBlock);
      emailElement = mainTableElement;
      const emailParams = {
        message: {
          to: [block.record.emails], // Recipient's email address
          cc: cc,
          bcc: bcc,
          subject: emailSubject.toString(),
          html: emailElement.toString(),
          attachments: attachments,
        },
      };
      // Send email
      await sendEmail(emailParams);
      bodyElement.removeChild(bodyBlock);
      bodyString = bodyStringCopy;
    }

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
