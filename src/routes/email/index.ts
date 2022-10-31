// route for building emails sent though the "action button" from grid widgets

import express from 'express';
import { extractGridData } from '../../utils/files';
import { preprocess, sendEmail, senderAddress } from '../../utils/email';
import xlsBuilder from '../../utils/files/xlsBuilder';
import { EmailPlaceholder } from '../../const/email';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import i18next from 'i18next';
import sanitize from 'sanitize-filename';
import { logger } from '../../services/logger.service';

/** File size limit, in bytes  */
const FILE_SIZE_LIMIT = 7 * 1024 * 1024;

/**
 * Handles email generation for grids, from template, and selected records.
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
      .catch((err) => logger.error(err));
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

/** Main route: send an email */
router.post('/', async (req, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }

  const email = await generateEmail(req, res);

  if (req.body.files) {
    await new Promise((resolve, reject) => {
      fs.readdir(`files/${sanitize(req.body.files)}`, async (err, files) => {
        if (err) {
          reject(err);
        }
        for (const file of files) {
          await new Promise((resolve2, reject2) => {
            fs.readFile(
              `files/${sanitize(req.body.files)}/${file}`,
              (err2, data) => {
                if (err2) {
                  reject2(err2);
                }
                email.attachments.push({
                  filename: file,
                  content: data,
                });
                resolve2(null);
              }
            );
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

  // Send mails
  try {
    await sendEmail({
      message: {
        to: email.recipient,
        subject: email.subject,
        html: email.body,
        attachments: email.attachments,
      },
    });
    return res.status(200).send({ status: 'OK' });
  } catch (err) {
    logger.error(err);
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
    return res.status(400).send(i18next.t('errors.missingFile'));

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
    return res.status(400).send(i18next.t('errors.fileSizeLimitReached'));
  }

  // Loop on files, to upload them
  for (const file of files) {
    // Check file size
    if (file.size > FILE_SIZE_LIMIT)
      return res.status(400).send(i18next.t('errors.fileSizeLimitReached'));
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    await new Promise((resolve, reject) => {
      fs.writeFile(
        `files/${folderName}/${sanitize(file.name)}`,
        file.data,
        (err) => {
          if (err) {
            reject(err);
          } else {
            logger.info(`Stored file ${file.name}`);
            resolve(null);
          }
        }
      );
    });
  }

  // Return id of folder
  return res.json({ id: folderName });
});

/** Create a preview of the email for grids */
router.post('/preview', async (req, res) => {
  // Authentication check
  const user = req.context.user;
  if (!user) {
    return res.status(401).send('User not connected');
  }

  const email = await generateEmail(req, res);
  return res.json({
    from: senderAddress,
    to: email.recipient,
    subject: email.subject,
    html: email.body,
    // attachments: email.attachments,
  });
});

export default router;
