import express from 'express';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { extractGridData } from '../../utils/files';
import { preprocess } from '../../utils/email';
import xlsBuilder from '../../utils/files/xlsBuilder';
import { EmailPlaceholder } from '../../const/email';
import { v4 as uuidv4 } from 'uuid';
import errors from '../../const/errors';
import fs from 'fs';

dotenv.config();

const FILE_SIZE_LIMIT = 7 * 1024 * 1024;

const EMAIL_FROM_PREFIX = process.env.MAIL_FROM_PREFIX || 'No reply';

const EMAIL_FROM = `${EMAIL_FROM_PREFIX} <${process.env.MAIL_FROM}>`;

const EMAIL_REPLY_TO = process.env.MAIL_REPLY_TO || process.env.MAIL_FROM;

const TRANSPORT_OPTIONS = {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  requireTLS: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
};

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
 * @param files id of files
 */
router.post('/', async (req, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }

  const email = await generateEmail(req, res);

  if (req.body.files) {
    await new Promise((resolve, reject) => {
      fs.readdir(`files/${req.body.files}`, async (err, files) => {
        if (err) {
          reject(err);
        }
        for (const file of files) {
          await new Promise((resolve2, reject2) => {
            fs.readFile(`files/${req.body.files}/${file}`, (err2, data) => {
              if (err2) {
                reject2(err2);
              }
              email.attachments.push({
                filename: file,
                content: data,
              });
              resolve2(null);
            });
          });
        }
        await new Promise((resolve2, reject2) => {
          fs.rm(`files/${req.body.files}`, { recursive: true }, (err2) => {
            if (err2) {
              reject2(err2);
            }
            resolve2(null);
          });
        });
        resolve(null);
      });
    });
  }

  // Split the email in multiple emails with 50 recipients max per email
  const MAX_RECIPIENTS = 50;
  const recipientsList = [];
  for (let i = 0; i < email.recipient.length; i += MAX_RECIPIENTS) {
    const recipients = email.recipient.slice(
      i,
      Math.min(i + MAX_RECIPIENTS, email.recipient.length)
    );
    recipientsList.push(recipients);
  }

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport(TRANSPORT_OPTIONS);

  // Send mails
  try {
    for (const recipients of recipientsList) {
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: recipients,
        subject: email.subject,
        html: email.body,
        attachments: email.attachments,
        replyTo: EMAIL_REPLY_TO,
      });
      if (!info.messageId) {
        throw new Error('Unexpected email sending response');
      }
    }
    return res.status(200).send({ status: 'OK' });
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send({ status: 'SMTP server failed to send the email', error: err });
  }
});

/**
 * Save email attachments in a dedicated folder.
 */
router.post('/files', async (req: any, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }
  // Check file
  if (!req.files || Object.keys(req.files.attachments).length === 0)
    return res.status(400).send(errors.missingFile);

  // Create folder to store files in
  const folderName = uuidv4();
  await new Promise((resolve, reject) => {
    fs.mkdir(`files/${folderName}`, { recursive: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    });
  });

  let files = req.files.attachments;
  // Transforms files into array if needed
  if (!Array.isArray(files)) {
    files = [files];
  }

  // Check sum of file sizes
  if (
    files.reduce((acc, x) => {
      return acc + x.size;
    }, 0) > FILE_SIZE_LIMIT
  ) {
    return res.status(400).send(errors.fileSizeLimitReached);
  }

  // Loop on files, to upload them
  for (const file of files) {
    // Check file size
    if (file.size > FILE_SIZE_LIMIT)
      return res.status(400).send(errors.fileSizeLimitReached);
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    await new Promise((resolve, reject) => {
      fs.writeFile(`files/${folderName}/${file.name}`, file.data, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Stored file ${file.name}`);
          resolve(null);
        }
      });
    });
  }

  // Return id of folder
  return res.json({ id: folderName });
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
