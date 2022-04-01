import express from 'express';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { extractGridData } from '../../utils/files';
import { preprocess } from '../../utils/email';
import xlsBuilder from '../../utils/files/xlsBuilder';
import { EmailPlaceholder } from '../../const/email';
dotenv.config();

const EMAIL_FROM = `"No reply" <${process.env.MAIL_USER}>`;

/**
 * Handles email generation, from template, and selected records.
 *
 * @param req request
 * @param res response
 * @returns Email with recipient / body as html / subject / attachment.
 */
const generateEmail = async (req, res) => {
  // Retrieving parameters
  const args = req.body;
  if (!args.recipient || (!args.subject && !args.body)) {
    return res.status(400).send('Missing parameters');
  }
  // Fetch records data for attachment / body if needed
  const attachments: any[] = [];
  let fileName: string;
  let columns: any[];
  let rows: any[];
  // Query data if attachment or dataset in email body
  if (args.attachment || args.body.includes(EmailPlaceholder.DATASET)) {
    await extractGridData(args, req.headers.authorization)
      .then((x) => {
        columns = x.columns;
        rows = x.rows;
      })
      .catch((err) => console.log(err));
  }
  // Attach excel
  if (args.attachment && rows.length > 0) {
    const today = new Date();
    const month = today.toLocaleString('en-us', { month: 'short' });
    const date = month + ' ' + today.getDate() + ' ' + today.getFullYear();
    const name = args.query.name.substring(3);
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
  return {
    recipient: args.recipient,
    subject,
    body,
    attachments,
  };
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

  const email = await generateEmail(req, res);

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

  // Send mail
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email.recipient,
      subject: email.subject,
      html: email.body,
      attachments: email.attachments,
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

router.post('/preview', async (req, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }

  const email = await generateEmail(req, res);
  return res.json({
    from: EMAIL_FROM,
    to: email.recipient,
    subject: email.subject,
    html: email.body,
    // attachments: email.attachments,
  });
});

export default router;
