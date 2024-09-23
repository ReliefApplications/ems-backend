import express from 'express';
import { logger } from '@services/logger.service';
import { EmailDistributionList, EmailNotification } from '@models';
import {
  buildEmail,
  buildTable,
  replaceFooter,
  replaceHeader,
  replaceSubject,
} from '@utils/notification/htmlBuilder';
import {
  ProcessedDataset,
  ValidateDataset,
  azureFunctionHeaders,
  fetchDatasets,
  fetchDistributionList,
  flattenObject,
  formatDate,
  getFlatFields,
  removeWhitespace,
} from '@utils/notification/util';
import { baseTemplate } from '@const/notification';
import i18next from 'i18next';
import { sendEmail } from '@utils/email/sendEmail';
import parse from 'node-html-parser';
import { validateEmail } from '@utils/validators/validateEmail';
import { CustomTemplate, ICustomTemplate } from '@models/customTemplate.model';
import axios from 'axios';
import config from 'config';

/**
 * Limit of records to be fetched for each dataset in email notification
 */
const DATASET_COUNT_LIMIT = 50;
/**
 * Interface of table style.
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
 *
 */
export interface DatasetPreviewArgs {
  resource: string;
  name?: string;
  query: {
    name: string;
    filter: any;
    fields: any[];
  };
  individualEmail?: boolean;
  limit?: number;
  reference?: string;
}

/**
 * Send email using SMTP email client
 */
const router = express.Router();

/**
 * Filters columns and their subColumns recursively, removing any column that has fields.
 *
 * @param columns - The array of columns to filter. Each column may contain nested subColumns.
 * @returns The filtered array of columns, where columns with fields are removed, but
 *          columns with subColumns are retained if they contain at least one valid subColumn.
 */
const filterColumns = (columns: any[]): any[] => {
  return columns
    .map((column) => {
      // If the column has subColumns, apply the filterColumns function recursively
      if (column.subColumns && column.subColumns.length > 0) {
        column.subColumns = filterColumns(column.subColumns);
      }
      return column;
    })
    .filter(
      (column) =>
        // Filter out columns that have fields or empty subColumns
        !column.fields?.length &&
        (!column.subColumns || column.subColumns.length > 0)
    );
};

router.post('/send-email/:configId', async (req, res) => {
  try {
    const notification = await EmailNotification.findById(req.params.configId)
      .populate('emailDistributionList')
      .populate('emailLayout')
      .exec();
    const datasetQueries: DatasetPreviewArgs[] = notification.datasets.map(
      (dataset) => {
        return {
          name: dataset.name,
          query: dataset.query,
          resource: dataset.resource,
          reference: dataset.reference,
          limit: DATASET_COUNT_LIMIT,
        };
      }
    );
    let datasets: ProcessedDataset[];
    try {
      datasets = await fetchDatasets(datasetQueries, req, res);
    } catch (e) {
      if (e.message == 'common.errors.dataNotFound') {
        return res.status(404).send(i18next.t(e.message));
      } else throw e;
    }
    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    notification.emailLayout = notification.emailLayout as ICustomTemplate;
    await buildEmail(notification.emailLayout, mainTableElement, datasets);

    // TODO: Phase 2 - allow records from any table not just first
    const subjectRecords = datasets.find(
      (dataset) => dataset.name === notification.datasets[0]?.name
    )?.records;

    const emailSubject = replaceSubject(
      notification?.emailLayout?.subject,
      subjectRecords
    );

    // Enforces clear if restrict is true
    if (notification.restrictSubscription === true) {
      notification.subscriptionList = [];
    }

    const emails = await fetchDistributionList(
      notification?.emailDistributionList as EmailDistributionList,
      req,
      res,
      notification.subscriptionList
    );

    // Build email
    const emailParams = {
      message: {
        ...emails,
        subject: emailSubject,
        html: baseElement.toString(),
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

router.post('/send-email-azure/:configId', async (req, res) => {
  try {
    await axios({
      url: `${config.get('mail.serverless.url')}/api/sendEmail/${
        req.params.configId
      }`,
      method: 'GET',
      headers: azureFunctionHeaders(req),
    });
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

router.post('/preview-email', async (req, res) => {
  try {
    const notification = req.body as EmailNotification;
    const datasetQueries: DatasetPreviewArgs[] = notification.datasets.map(
      (dataset) => {
        return {
          name: dataset.name,
          query: dataset.query,
          resource: dataset.resource,
          limit: DATASET_COUNT_LIMIT,
          reference: dataset.reference,
        };
      }
    );
    let datasets: ProcessedDataset[] = [];
    try {
      datasets = await fetchDatasets(datasetQueries, req, res);
    } catch (e) {
      if (e.message === 'common.errors.dataNotFound') {
        return res.status(404).send(req.t(e));
      } else {
        logger.error(
          'preview-email route handler - configuration query',
          e.message,
          { stack: e.stack }
        );
      }
    }
    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    const subjectRecords = datasets.find(
      (dataset) => dataset.name === notification.datasets[0]?.name
    )?.records;
    if (typeof notification?.emailLayout === 'string') {
      notification.emailLayout = await CustomTemplate.findById(
        notification.emailLayout
      ).exec();
    }
    notification.emailLayout = notification.emailLayout as ICustomTemplate;
    const emailSubject = replaceSubject(
      notification?.emailLayout?.subject,
      subjectRecords
    );
    await buildEmail(notification.emailLayout, mainTableElement, datasets);
    const emailTable = Buffer.from(baseElement.toString()).toString('base64');
    res.send({
      html: emailTable,
      subject: emailSubject,
    });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

router.post('/preview-distribution-lists/', async (req, res) => {
  try {
    const notification = req.body as EmailNotification;
    if (!notification.emailDistributionList) {
      return res.status(400).send(req.t('common.errors.internalServerError'));
    }
    let distributionList =
      notification?.emailDistributionList as EmailDistributionList;
    if (typeof notification?.emailDistributionList === 'string') {
      distributionList = await EmailDistributionList.findById(
        notification?.emailDistributionList
      ).exec();
    }
    const emails = await fetchDistributionList(distributionList, req, res);
    let individualEmailList = [];
    if (notification?.datasets) {
      const individualEmailQueries: DatasetPreviewArgs[] = notification.datasets
        ?.filter((dataset) => dataset.individualEmail)
        ?.map((dataset) => {
          return {
            name: dataset.name,
            query: {
              name: dataset?.query?.name,
              fields: dataset?.individualEmailFields || [],
              filter: dataset?.query?.filter,
            },
            resource: dataset.resource,
            reference: dataset.reference,
            individualEmail: dataset.individualEmail,
          };
        });
      let individualEmails: ProcessedDataset[] = [];
      individualEmails = await fetchDatasets(individualEmailQueries, req, res);
      individualEmailList = individualEmails?.map((data) => ({
        name: data.name,
        emails: data.records
          .flatMap((record) =>
            Object.values(record).flatMap((email: string | string[]) => {
              // Flatten and split by commas, handle both array and string types
              return Array.isArray(email)
                ? email?.flatMap((rec) =>
                    Object.values(rec)?.flatMap((val) => val?.split(','))
                  )
                : email?.split(',');
            })
          )
          .map((rec) => rec.trim())
          .filter(validateEmail),
      }));
    }

    res.send({
      ...emails,
      individualEmailList,
    });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

router.post('/preview-dataset', async (req, res) => {
  try {
    const notification = req.body as DatasetPreviewArgs;
    let dataset: ProcessedDataset;
    try {
      if (!notification.limit) {
        notification.limit = Number.MAX_SAFE_INTEGER;
      }
      dataset = (await fetchDatasets([notification], req, res))[0];
      if (dataset.records.length <= DATASET_COUNT_LIMIT) {
        const resultCount = dataset.records.length;
        const table = parse(buildTable(dataset));
        const tableElement = Buffer.from(table.toString()).toString('base64');
        res.send({ tableHtml: tableElement, count: resultCount });
      } else {
        const resultCount = dataset.records.length;
        dataset.records = dataset.records.slice(0, 50);
        const table = parse(buildTable(dataset));
        const tableElement = Buffer.from(table.toString()).toString('base64');
        res.send({ tableHtml: tableElement, count: resultCount });
      }
    } catch (e) {
      if (e.message === 'common.errors.dataNotFound') {
        return res.status(404).send(i18next.t(e.message));
      } else throw e;
    }
  } catch (e) {
    logger.error('preview-dataset route handler', e.message, {
      stack: e.stack,
    });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

router.post('/validate-dataset', async (req, res) => {
  try {
    const notification = req.body as DatasetPreviewArgs[];
    let datasetArray: ValidateDataset[];
    try {
      notification.forEach((dataset) => {
        if (!dataset.limit) {
          dataset.limit = Number.MAX_SAFE_INTEGER;
        }
      });
      datasetArray = await fetchDatasets(notification, req, res, true);
      const inValidDataSets = datasetArray
        .filter((dataset) => dataset?.recordsCount > DATASET_COUNT_LIMIT)
        .map((dataset) => ({
          count: dataset?.recordsCount,
          name: dataset?.name,
        }));
      res.send({ inValidDataSets });
    } catch (e) {
      if (e.message === 'common.errors.dataNotFound') {
        return res.status(404).send(i18next.t(e.message));
      } else throw e;
    }
  } catch (e) {
    logger.error('validate-dataset route handler', e.message, {
      stack: e.stack,
    });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * POST request for sending separate emails.
 * On a selected boolean flag the dataset is sliced and send independently by row to each email in the distribution list
 */
router.post('/send-individual-email/:configId', async (req, res) => {
  try {
    const notification = await EmailNotification.findById(req.params.configId)
      .populate('emailDistributionList')
      .populate('emailLayout')
      .exec();
    const sendSeparateFields = [];
    // fields which are common in send separate and query fields
    const commonFields = [];
    const datasetQueries: DatasetPreviewArgs[] = notification.datasets.map(
      (dataset) => {
        if (dataset.individualEmail) {
          const flattenIndividualFields = getFlatFields(
            dataset.individualEmailFields
          );
          const flattenFields = getFlatFields(dataset?.query?.fields);
          commonFields.push({
            name: dataset.name,
            emailFields: flattenIndividualFields
              .filter((emailField) =>
                flattenFields.some((field) => field.name === emailField.name)
              )
              .map(({ name }) => name),
          });
          sendSeparateFields.push({
            name: dataset.name,
            emailFields: flattenIndividualFields?.map(({ name }) => name),
          });
        }
        return {
          name: dataset.name,
          query: {
            name: dataset?.query?.name,
            fields: dataset?.query.fields.concat(
              dataset?.individualEmailFields
            ),
            filter: dataset?.query?.filter,
          },
          resource: dataset.resource,
          individualEmail: dataset.individualEmail || false,
        };
      }
    );

    let datasets: ProcessedDataset[];

    try {
      datasets = await fetchDatasets(datasetQueries, req, res);
    } catch (e) {
      if (e.message === 'common.errors.dataNotFound') {
        return res.status(404).send(req.t(e.message));
      } else throw e;
    }

    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    notification.emailLayout = notification.emailLayout as ICustomTemplate;
    // Add banner if available
    if (notification.emailLayout.banner.bannerImage) {
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

    // Add header if available
    if (notification.emailLayout.header) {
      const headerElement = replaceHeader(notification.emailLayout.header);
      const backgroundColor =
        notification.emailLayout.header.headerBackgroundColor || '#00205c';
      mainTableElement.appendChild(
        parse(
          `<tr bgcolor = ${backgroundColor}><td style="font-size: 13px; font-family: Helvetica, Arial, sans-serif;">${headerElement}</td></tr>`
        )
      );
    }

    mainTableElement.appendChild(
      parse(`<tr>
                <td height="25"></td>
            </tr>`)
    );

    // Add body div
    const bodyDiv = parse(
      '<tr id ="body" bgcolor = ${backgroundColor}><td></td></tr>'
    );
    mainTableElement.appendChild(bodyDiv);

    let bodyString = notification.emailLayout.body.bodyHtml;

    // Add footer if available
    if (notification.emailLayout.footer) {
      const footerElement = replaceFooter(notification.emailLayout.footer);
      const backgroundColor =
        notification.emailLayout.footer.footerBackgroundColor || '#ffffff';
      mainTableElement.appendChild(
        parse(
          `<tr bgcolor= ${backgroundColor}><td style="font-size: 13px; font-family: Helvetica, Arial, sans-serif;">${footerElement}</td></tr>`
        )
      );
    }

    // Add copyright
    mainTableElement.appendChild(
      parse(/*html*/ `
      <tr bgcolor="#00205c">
        <td mc:edit="footer1" style="font-size: 12px; color: #fff; font-family: 'Roboto', Arial, sans-serif; text-align: center; padding: 0 10px;">
          ${i18next.t('common.copyright.who')}
        </td>
      </tr>`)
    );

    let subjectRecords = {};

    // TODO: Phase 2 - allow records from any table not just first

    subjectRecords = datasets.find(
      (dataset) => dataset.name === notification.datasets[0].name
    ).records;

    const emailSubject = replaceSubject(notification?.emailLayout?.subject, [
      subjectRecords,
    ]);

    const bodyElement = mainTableElement.getElementById('body');

    // Enforces clear if restrict is true
    if (notification.restrictSubscription === true) {
      notification.subscriptionList = [];
    }

    const { to, cc, bcc } = await fetchDistributionList(
      notification?.emailDistributionList as EmailDistributionList,
      req,
      res,
      notification.subscriptionList
    );

    const individualEmail = [];
    let commonBlockEmails = [];

    for (const dataset of datasets) {
      if (dataset.individualEmail) {
        const selectedEmailFieldName =
          sendSeparateFields.find((field) => field.name === dataset.name)
            ?.emailFields || [];
        const selectedCommonFieldName =
          commonFields.find((field) => field.name === dataset.name)
            ?.emailFields || [];
        // remove individual email fields from column
        dataset.columns = dataset.columns?.filter(
          (column) =>
            !selectedEmailFieldName.includes(column.name) ||
            selectedCommonFieldName.includes(column.name)
        );
        //get all emails from selected individual email fields and add it in new key - individualEmails
        dataset.records = dataset.records.map((record) => {
          const individualEmails = [];
          selectedEmailFieldName.forEach((field) => {
            if (record[field]) {
              let emails: string[] = [];

              if (Array.isArray(record[field])) {
                emails = (record[field] as Array<any>)
                  ?.flatMap(Object.values)
                  ?.flatMap(
                    (email) =>
                      email
                        ?.split(',')
                        ?.map((rec) => rec.trim())
                        ?.filter(validateEmail) || []
                  ); // Flatten and process list-type data
              } else {
                emails = (record[field] as string)
                  ?.split(',')
                  ?.map((rec) => rec.trim())
                  ?.filter(validateEmail); // Process string-type data
              }

              if (emails?.length) {
                individualEmails.push(...emails); // Add valid emails if any
              }
            }

            // delete individual email fields from records
            if (!selectedCommonFieldName.includes(field)) delete record[field];
          });
          return {
            ...record,
            individualEmails: Array.from(new Set(individualEmails)),
          };
        });
      }
    }
    // group dataset by emails
    const groupByEmail = {};
    const commonBlocks = [];

    for (const dataset of datasets) {
      if (dataset.individualEmail) {
        // Individual email format
        dataset.records.forEach((record) => {
          const emails = record.individualEmails as Array<string>;
          delete record.individualEmails;
          if (emails.length) {
            emails?.forEach((email) => {
              // Check if the email and dataset name already exist in groupByEmail
              const groupEmail = groupByEmail[email]?.find(
                (rec) => rec.email === email && rec.name === dataset.name
              );
              if (groupEmail) {
                // If the email and dataset combination exists, push the record into the corresponding array
                groupEmail?.records?.push(record);
              } else if (groupByEmail[email]) {
                // If the email exists in groupByEmail but not the dataset, push a new dataset entry for the email
                groupByEmail[email].push({
                  records: [record],
                  name: dataset.name,
                  columns: dataset.columns,
                  individualEmail: true,
                  email,
                });
              } else {
                // If the email doesn't exist in groupByEmail, create a new entry with the dataset records for the email
                groupByEmail[email] = [
                  {
                    records: [record],
                    name: dataset.name,
                    columns: dataset.columns,
                    individualEmail: true,
                    email,
                  },
                ];
              }
              individualEmail.push(email);
            });
          }
        });
      } else {
        // Block email format
        if (bodyString.includes(`{{${dataset.name}}}`)) {
          bodyString = bodyString.replace(
            `{{${dataset.name}}}`,
            buildTable(dataset)
          );
        }
        commonBlocks.push({
          records: [...dataset.records],
          name: dataset.name,
          columns: dataset.columns,
        });
      }
    }

    let isEmailSend = false;
    commonBlockEmails =
      to?.filter((email) => !individualEmail?.includes(email)) || [];
    for (const email in groupByEmail) {
      const bodyStringCopy = bodyString;
      for (const block of groupByEmail[email]) {
        if (bodyString.includes(`{{${block.name}}}`)) {
          bodyString = bodyString.replace(
            `{{${block.name}}}`,
            buildTable(block)
          );
        }
      }

      const bodyBlock = parse(`<tr><td>${bodyString}</td></tr>`);

      // remove other individual blocks
      const blockNameRegex = /{{\s*[\s\S]*?\s*}}/g;

      bodyElement.appendChild(bodyBlock);
      // send emails separately for each email
      const emailParams = {
        message: {
          to: [email] ?? [], // Recipient's email address
          cc: cc ?? [],
          bcc: bcc ?? [],
          subject: emailSubject,
          html: mainTableElement.toString().replaceAll(blockNameRegex, ''),
        },
      };
      // Send email
      await sendEmail(emailParams);
      isEmailSend = true;
      bodyElement.removeChild(bodyBlock);
      bodyString = bodyStringCopy;
    }

    if (commonBlockEmails.length) {
      // let bodyHtml = config.emailLayout.body.bodyHtml;
      if (bodyString.includes(`{{${commonBlocks[0].name}}}`)) {
        bodyString = bodyString.replace(
          `{{${commonBlocks[0].name}}}`,
          buildTable(commonBlocks[0])
        );
      }
      const bodyBlock = parse(`<tr><td>${bodyString}</td></tr>`);
      bodyElement.appendChild(bodyBlock);

      const blockNameRegex = /{{\s*[\s\S]*?\s*}}/g;
      const emailParams = {
        message: {
          to: commonBlockEmails ?? [], // Recipient's email address
          cc: cc ?? [],
          bcc: bcc ?? [],
          subject: emailSubject,
          html: mainTableElement.toString().replaceAll(blockNameRegex, ''),
        },
      };
      // Send email
      await sendEmail(emailParams);
      isEmailSend = true;
    }

    if (isEmailSend) {
      res.status(200).json({ message: 'Email sent successfully' });
    } else {
      res.status(400).json({ message: 'No emails were sent' });
    }
  } catch (err) {
    logger.error(
      'send-individual-email route handler - configuration query',
      err.message,
      { stack: err.stack }
    );
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

router.post('/send-quick-email', async (req, res) => {
  try {
    const { emailDistributionList, emailLayout, tableInfo } = req.body;
    tableInfo.forEach((tableData) => {
      tableData.columns = filterColumns(getFlatFields(tableData.columns));
      const columns = tableData.columns?.map((column) =>
        removeWhitespace(column.name?.toLowerCase())
      );
      tableData.records = tableData.records?.map((record) =>
        flattenObject(record, columns)
      );
    });
    tableInfo.forEach((tableData) => {
      for (const record of tableData.records) {
        for (const column of tableData.columns) {
          switch (column.type) {
            case 'Date':
              record[column.name] = formatDate(record[column.name], 'MM/DD/YY');
              break;
            case 'DateTime':
              record[column.name] = formatDate(
                record[column.name],
                'MM/DD/YY HH:mmA'
              );
              break;
            case 'Time':
              record[column.name] = formatDate(record[column.name], 'HH:mmA');
              break;
            default:
              break;
          }
        }
      }
    });
    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    await buildEmail(emailLayout, mainTableElement, tableInfo);

    // Replace subject placeholders
    const subjectRecords = tableInfo.length ? tableInfo[0].records : [];

    const emailSubject = replaceSubject(emailLayout.subject, subjectRecords);

    // Get recipients
    const to = emailDistributionList.to;
    const cc = emailDistributionList.cc;
    const bcc = emailDistributionList.bcc;

    // Add attachments
    const attachments: { path: string; cid: string }[] = [];

    // Add header logo
    if (emailLayout.header.headerLogo) {
      attachments.push({
        path: emailLayout.header.headerLogo,
        cid: 'headerImage',
      });
    }
    // Add footer logo
    if (emailLayout.footer.footerLogo) {
      attachments.push({
        path: emailLayout.footer.footerLogo,
        cid: 'footerImage',
      });
    }
    // Add banner image
    if (emailLayout.banner.bannerImage) {
      attachments.push({
        path: emailLayout.banner.bannerImage,
        cid: 'bannerImage',
      });
    }

    // Build email
    const emailParams = {
      message: {
        to: to,
        cc: cc,
        bcc: bcc,
        subject: emailSubject,
        html: baseElement.toString(),
        attachments: attachments,
      },
    };

    // Send email
    await sendEmail(emailParams);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    logger.error('send-quick-email route handler - error', err.message, {
      stack: err.stack,
    });
    return res.status(500).send(i18next.t('common.errors.internalServerError'));
  }
});

router.post('/preview-quick-email', async (req, res) => {
  try {
    const { emailLayout, tableInfo } = req.body;
    tableInfo.forEach((tableData) => {
      tableData.columns = filterColumns(getFlatFields(tableData.columns));
      const columns = tableData.columns?.map((column) =>
        removeWhitespace(column.name?.toLowerCase())
      );
      tableData.records = tableData.records?.map((record) =>
        flattenObject(record, columns)
      );
    });

    tableInfo.forEach((tableData) => {
      for (const record of tableData.records) {
        for (const column of tableData.columns) {
          switch (column.type) {
            case 'Date':
              record[column.name] = formatDate(record[column.name], 'MM/DD/YY');
              break;
            case 'DateTime':
              record[column.name] = formatDate(
                record[column.name],
                'MM/DD/YY HH:mmA'
              );
              break;
            case 'Time':
              record[column.name] = formatDate(record[column.name], 'HH:mmA');
              break;
            default:
              break;
          }
        }
      }
    });
    // Generate main html structure
    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    await buildEmail(emailLayout, mainTableElement, tableInfo);

    // Replace subject placeholders
    const subjectRecords = tableInfo.length ? tableInfo[0].records : [];

    const emailSubject = replaceSubject(emailLayout.subject, subjectRecords);
    // Add header logo
    if (emailLayout.header.headerLogo) {
      const headerImageElement = baseElement.getElementById('headerImage');
      if (headerImageElement) {
        headerImageElement.setAttribute('src', emailLayout.header.headerLogo);
      }
    }
    // Add footer logo
    if (emailLayout.footer.footerLogo) {
      const footerImageElement = baseElement.getElementById('footerImage');
      if (footerImageElement) {
        footerImageElement.setAttribute('src', emailLayout.footer.footerLogo);
      }
    }
    // Add banner image
    if (emailLayout.banner.bannerImage) {
      const bannerImageElement = baseElement.getElementById('bannerImage');
      if (bannerImageElement) {
        bannerImageElement.setAttribute('src', emailLayout.banner.bannerImage);
      }
    }
    const emailTable = Buffer.from(baseElement.toString()).toString('base64');
    res.send({
      html: emailTable,
      subject: emailSubject,
    });
  } catch (err) {
    logger.error('send-quick-email route handler - error', err.message, {
      stack: err.stack,
    });
    return res.status(500).send(i18next.t('common.errors.internalServerError'));
  }
});

router.post('/add-subscription', async (req, res) => {
  let configId = '';
  let userEmail = '';
  try {
    configId = req.body.configId;
    userEmail = req.context.user.username;
    let notification: EmailNotification;
    try {
      notification = await EmailNotification.findById(configId).exec();
      if (!notification) {
        // Response handling when email notification does not exist
        return res.status(400).send(
          i18next.t('routes.email.subscription.alerts.dataNotFound', {
            type: 'add subscription',
          })
        );
      }

      if (notification.restrictSubscription) {
        return res
          .status(400)
          .send(i18next.t('routes.email.subscription.alerts.restricted'));
      }

      // Response handling when user exists in distribution list
      const emails = new Set(notification.subscriptionList);
      if (emails.has(userEmail)) {
        return res.status(409).send(
          i18next.t('routes.email.subscription.alerts.userAlreadyExists', {
            notificationName: notification.name,
          })
        );
      }
      emails.add(userEmail);
      notification.subscriptionList = Array.from(emails);
      await notification.save();
    } catch (err) {
      logger.error(err);
      return res
        .status(500)
        .send(i18next.t('common.errors.internalServerError'));
    }

    // Successful response for adding user to distribution list
    res.send(
      i18next.t('routes.email.subscription.alerts.success', {
        notificationName: notification.name,
      })
    );
  } catch (err) {
    // Response handling when email notification does not exist
    return res.status(400).send(
      i18next.t('routes.email.subscription.alerts.dataNotFound', {
        type: 'add subscription',
      })
    );
  }
});

router.post('/remove-subscription', async (req, res) => {
  let configId = '';
  let userEmail = '';
  try {
    configId = req.body.configId;
    userEmail = req.context.user.username;
    let notification: EmailNotification;
    try {
      notification = await EmailNotification.findById(configId).exec();
      if (!notification) {
        // Response handling when email notification does not exist
        return res.status(400).send(
          i18next.t('routes.email.subscription.alerts.dataNotFound', {
            type: 'remove subscription',
          })
        );
      }

      // Response handling when user exists in distribution list
      const emails = new Set(notification.subscriptionList);
      if (emails.has(userEmail)) {
        emails.delete(userEmail);
        notification.subscriptionList = Array.from(emails);
        await notification.save();
        // Successful response for removing user from distribution list
        res.send(
          i18next.t('routes.email.subscription.alerts.unsubscribe.success', {
            notificationName: notification.name,
          })
        );
      } else {
        // Response handling when user does not exist in distribution list
        return res.status(409).send(
          i18next.t('routes.email.subscription.alerts.userNotSubscribed', {
            notificationName: notification.name,
          })
        );
      }
    } catch (err) {
      logger.error(err);
      return res
        .status(500)
        .send(i18next.t('common.errors.internalServerError'));
    }
  } catch (err) {
    // Response handling when email notification does not exist
    return res.status(400).send(
      i18next.t('routes.email.subscription.alerts.dataNotFound', {
        type: 'remove subscription',
      })
    );
  }
});

export default router;
