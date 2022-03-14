import express from 'express';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { extractGridData, preprocess } from '../../utils/files';
import xlsBuilder from '../../utils/files/xlsBuilder';
import { Placeholders } from '../../const/placeholders';
dotenv.config();

/**
 * Transforms a list into a flat list.
 *
 * @param arr list.
 * @returns flat list.
 */
const flatDeep = (arr: any[]): any[] => {
  return arr.reduce(
    (acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val) : val),
    []
  );
};

/**
 * Gets flat fields from list of query fields
 *
 * @param fields query fields
 * @param prefix fields prefix
 * @returns flat fields
 */
const getFields = (fields: any[], prefix?: string): any[] => {
  return flatDeep(
    fields
      .filter((x) => x.kind !== 'LIST')
      .map((f) => {
        switch (f.kind) {
          case 'OBJECT': {
            return getFields(f.fields, f.name);
          }
          default: {
            const path = prefix ? `${prefix}.${f.name}` : f.name;
            return { name: path, title: f.label ? f.label : f.name };
          }
        }
      })
  );
};

/**
 * Send email using SMTP email client
 */
const router = express.Router();

/**
 * Send email using SMTP email client
 *
 * @param recipient Recipient of the email.
 * @param subject Subject of the email.
 * @param body Body of the email, if not given we put the formatted records.
 * @param gridSettings Grid specific settings.
 * @param gridSettings.query Query settings.
 * @param gridSettings.query.name Name of the query.
 * @param gridSettings.query.fields Fields of the query.
 * @param gridSettings.ids List of records to include in the email.
 * @param gridSettings.sortField Sort field.
 * @param gridSettings.sortOrder Sort order.
 * @param attachment Whether an excel with the dataset is attached to the mail or not.
 */
router.post('/', async (req, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }
  // Retrieving parameters
  const args = req.body;
  if (!args.recipient || (!args.subject && !args.body)) {
    return res.status(400).send('Missing parameters');
  }

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    requireTLS: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // Fetch records data for attachment / body if needed
  const attachments: any[] = [];
  let fileName: string;
  let columns: any[];
  let rows: any[];
  // Query data if attachment or dataset in email body
  if (args.attachment || args.body.includes(Placeholders.DATASET)) {
    ({ columns, rows } = await extractGridData(
      {
        query: args.gridSettings.query,
        ids: args.gridSettings.ids,
        sortField: args.gridSettings.sortField,
        sortOrder: args.gridSettings.sortOrder,
        format: 'xlsx',
        fields: getFields(args.gridSettings.query.fields),
        filter: {
          logic: 'and',
          filters: [
            {
              operator: 'eq',
              field: 'ids',
              value: args.gridSettings.ids,
            },
          ],
        },
      },
      req.headers.authorization
    ));
  }
  // Attach excel
  if (args.attachment) {
    const today = new Date();
    const month = today.toLocaleString('en-us', { month: 'short' });
    const date = month + ' ' + today.getDate() + ' ' + today.getFullYear();
    const name = args.gridSettings.query.name.substring(3);
    fileName = name + ' ' + date;
    const file = await xlsBuilder(fileName, columns, rows);
    attachments.push({
      filename: `${fileName}.xlsx`,
      content: file,
    });
  }

  // Preprocess body and subject
  const body = preprocess(args.body, {
    fields: columns,
    rows,
  });
  const subject = preprocess(args.subject);

  // Send mail
  try {
    const info = await transporter.sendMail({
      from: `"No reply" <${process.env.MAIL_USER}>`,
      to: args.recipient,
      subject,
      html: body,
      attachments,
    });
    if (info.messageId) {
      return res.status(200).send({ status: 'OK' });
    } else {
      return res
        .status(400)
        .send({ status: 'SMTP server failed to send the email' });
    }
  } catch {
    return res
      .status(400)
      .send({ status: 'SMTP server failed to send the email' });
  }
});

export default router;
