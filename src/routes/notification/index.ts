import express from 'express';
import { logger } from '@services/logger.service';
import { EmailNotification } from '@models';
import {
  buildEmail,
  buildTable,
  replaceFooter,
  replaceHeader,
  replaceSubject,
} from '@utils/notification/htmlBuilder';
import {
  ProcessedDataset,
  fetchDatasets,
  fetchDistributionList,
} from '@utils/notification/util';
import { baseTemplate } from '@const/notification';
import i18next from 'i18next';
import { sendEmail } from '@utils/email/sendEmail';
import parse from 'node-html-parser';

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
}

/**
 * Send email using SMTP email client
 */
const router = express.Router();

router.post('/send-email/:configId', async (req, res) => {
  try {
    const config = await EmailNotification.findById(req.params.configId).exec();
    const datasetQueries: DatasetPreviewArgs[] = config.datasets.map(
      (dataset) => {
        return {
          name: dataset.name,
          query: dataset.query,
          resource: dataset.resource,
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
    await buildEmail(config.emailLayout, mainTableElement, datasets);

    // TODO: Phase 2 - allow records from any table not just first
    const subjectRecords = datasets.find(
      (dataset) => dataset.name === config.datasets[0]?.name
    )?.records;

    const emailSubject = replaceSubject(
      config.get('emailLayout').subject,
      subjectRecords
    );

    // Add attachments
    // Use base64 encoded images as path for CID attachments
    // This is required for images to render in the body on legacy clients
    const attachments: { path: string; cid: string }[] = [];

    // Add header logo
    if (config.emailLayout.header.headerLogo) {
      attachments.push({
        path: config.emailLayout.header.headerLogo,
        cid: 'headerImage',
      });
    }
    // Add footer logo
    if (config.emailLayout.footer.footerLogo) {
      attachments.push({
        path: config.emailLayout.footer.footerLogo,
        cid: 'footerImage',
      });
    }
    // Add banner image
    if (config.emailLayout.banner.bannerImage) {
      attachments.push({
        path: config.emailLayout.banner.bannerImage,
        cid: 'bannerImage',
      });
    }

    const emails = await fetchDistributionList(
      config.emailDistributionList,
      req,
      res
    );

    // Build email
    const emailParams = {
      message: {
        ...emails,
        subject: emailSubject,
        html: baseElement.toString(),
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

router.post('/preview-email', async (req, res) => {
  try {
    const config = req.body as EmailNotification;
    const datasetQueries: DatasetPreviewArgs[] = config.datasets.map(
      (dataset) => {
        return {
          name: dataset.name,
          query: dataset.query,
          resource: dataset.resource,
          limit: DATASET_COUNT_LIMIT,
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
      (dataset) => dataset.name === config.datasets[0]?.name
    )?.records;
    const emailSubject = replaceSubject(
      config?.emailLayout?.subject,
      subjectRecords
    );
    await buildEmail(config.emailLayout, mainTableElement, datasets);
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
    const config = req.body as EmailNotification;
    if (!config.emailDistributionList) {
      return res.status(400).send(req.t('common.errors.internalServerError'));
    }
    const emails = await fetchDistributionList(
      config.emailDistributionList,
      req,
      res
    );
    res.send({
      ...emails,
      name: config.emailDistributionList.name,
    });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

router.post('/preview-dataset', async (req, res) => {
  try {
    const config = req.body as DatasetPreviewArgs;
    let dataset: ProcessedDataset;
    try {
      if (!config.limit) {
        config.limit = Number.MAX_SAFE_INTEGER;
      }
      dataset = (await fetchDatasets([config], req, res))[0];
      if (dataset.records.length <= DATASET_COUNT_LIMIT) {
        const resultCount = dataset.records.length;
        const table = parse(buildTable(dataset));
        const tableElement = Buffer.from(table.toString()).toString('base64');
        res.send({ tableHtml: tableElement, count: resultCount });
      } else {
        res.send({ count: dataset.records.length });
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

/**
 * POST request for sending separate emails.
 * On a selected boolean flag the dataset is sliced and send independently by row to each email in the distribution list
 */
router.post('/send-individual-email/:configId', async (req, res) => {
  try {
    const config = await EmailNotification.findById(req.params.configId).exec();
    const datasetQueries: DatasetPreviewArgs[] = config.datasets.map(
      (dataset) => {
        return {
          name: dataset.name,
          query: dataset.query,
          resource: dataset.resource,
          isIndividualEmail: dataset.individualEmail || false,
        };
      }
    );

    let datasets: ProcessedDataset[];
    const processedIndividualRecords: ProcessedDataset[] = [];

    try {
      datasets = await fetchDatasets(datasetQueries, req, res);
    } catch (e) {
      if (e.message === 'common.errors.dataNotFound') {
        return res.status(404).send(req.t(e.message));
      } else throw e;
    }

    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');

    console.log(datasets);

    // Add banner if available
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

    // Add header if available
    if (config.emailLayout.header) {
      const headerElement = replaceHeader(config.emailLayout.header);
      const backgroundColor =
        config.emailLayout.header.headerBackgroundColor || '#00205c';
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

    let bodyString = config.emailLayout.body.bodyHtml;

    // Add footer if available
    if (config.emailLayout.footer) {
      const footerElement = replaceFooter(config.emailLayout.footer);
      const backgroundColor =
        config.emailLayout.footer.footerBackgroundColor || '#ffffff';
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
      (dataset) => dataset.name === config.datasets[0].name
    ).records;

    const emailSubject = replaceSubject(config.get('emailLayout').subject, [
      subjectRecords,
    ]);

    const bodyElement = mainTableElement.getElementById('body');

    const cc = config.get('emailDistributionList').cc.inputEmails;
    const bcc = config.get('emailDistributionList').bcc.inputEmails;
    const attachments: { path: string; cid: string }[] = [];
    // Use base64 encoded images as path for CID attachments
    // This is required for images to render in the body on legacy clients
    if (config.emailLayout.header.headerLogo) {
      attachments.push({
        path: config.emailLayout.header.headerLogo,
        cid: 'headerImage',
      });
    }
    if (config.emailLayout.footer.footerLogo) {
      attachments.push({
        path: config.emailLayout.footer.footerLogo,
        cid: 'footerImage',
      });
    }
    if (config.emailLayout.banner.bannerImage) {
      attachments.push({
        path: config.emailLayout.banner.bannerImage,
        cid: 'bannerImage',
      });
    }

    for (const dataset of datasets) {
      if (dataset.isIndividualEmail) {
        // Individual email format
        dataset.records.forEach((record) =>
          processedIndividualRecords.push({
            records: [record],
            name: dataset.name,
            columns: dataset.columns,
          })
        );
      } else {
        // Block email format
        if (bodyString.includes(`{{${dataset.name}}}`)) {
          bodyString = bodyString.replace(
            `{{${dataset.name}}}`,
            buildTable(dataset)
          );
        }
      }
    }

    for (const block of processedIndividualRecords) {
      // let bodyHtml = config.emailLayout.body.bodyHtml;
      const bodyStringCopy = bodyString;
      if (bodyString.includes(`{{${block.name}}}`)) {
        bodyString = bodyString.replace(`{{${block.name}}}`, buildTable(block));
      }

      const bodyBlock = parse(`<tr><td>${bodyString}</td></tr>`);

      // remove other individual blocks
      const blockNameRegex = /<p>{{\s*.*?\s*}}<\/p>/g;

      bodyElement.appendChild(bodyBlock);
      const emailParams = {
        message: {
          to: config.get('emailDistributionList').to.inputEmails, // Recipient's email address
          cc: cc,
          bcc: bcc,
          subject: emailSubject,
          html: mainTableElement.toString().replace(blockNameRegex, ''),
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

    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    await buildEmail(emailLayout, mainTableElement, tableInfo);

    // Replace subject placeholders
    const emailSubject = emailLayout.subject;

    // Get recipients
    const to = emailDistributionList.To;
    const cc = emailDistributionList.Cc;
    const bcc = emailDistributionList.Bcc;

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

    // Generate main html structure
    const baseElement = parse(baseTemplate);
    const mainTableElement = baseElement.getElementById('mainTable');
    await buildEmail(emailLayout, mainTableElement, tableInfo);

    // Replace subject placeholders
    const emailSubject = emailLayout.subject;

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

export default router;
