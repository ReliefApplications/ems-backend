// route for building emails sent though the "action button" from grid widgets

import express from 'express';
import { Placeholder } from '@const/placeholders';
import {
  downloadFile,
  extractGridData,
  listFolderFiles,
  uploadFile,
} from '@utils/files';
import { preprocess, sendEmail, senderAddress } from '@utils/email';
import xlsBuilder from '@utils/files/xlsBuilder';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import i18next from 'i18next';
import sanitize from 'sanitize-filename';
import { logger } from '@services/logger.service';

/** File size limit, in bytes  */
const FILE_SIZE_LIMIT = 7 * 1024 * 1024;

/** Local folder where attachments are downloaded before being sent */
const ATTACHMENTS_ROOT = path.resolve('files');

/**
 * Resolve a local path inside the attachments folder.
 * The value is sanitised and the resolved path must stay inside the folder,
 * so a request can never read or delete anything else on the server.
 *
 * @param relativePath folder id (as returned by POST /email/files) or blob name
 * @returns absolute path, or null when the value does not resolve inside the attachments folder
 */
const resolveAttachmentPath = (relativePath: unknown): string | null => {
  if (typeof relativePath !== 'string') {
    return null;
  }
  const safeSegments = relativePath
    .split(/[\\/]/)
    .map((segment) => sanitize(segment))
    .filter((segment) => segment.length > 0);
  if (safeSegments.length === 0) {
    return null;
  }
  const resolved = path.resolve(ATTACHMENTS_ROOT, ...safeSegments);
  return resolved.startsWith(ATTACHMENTS_ROOT + path.sep) ? resolved : null;
};

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
  if (!args.body) {
    args.body = Placeholder.DATASET;
  }
  // Fetch records data for attachment / body if needed
  const attachments: any[] = [];
  let fileName: string;
  let columns: any[] = [];
  let rows: any[] = [];
  // Query data if attachment or dataset in email body
  if (args.attachment || args.body.includes(Placeholder.DATASET)) {
    await extractGridData(req, args)
      .then((x) => {
        columns = x.columns.map((column: any) => {
          const field = args.fields.find((y: any) => y.name === column.name);
          if (field && field.width) {
            column.width = field.width;
          }
          return column;
        });
        rows = x.rows;
      })
      .catch((err) => logger.error(err.message, { stack: err.stack }));
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
  try {
    // Authentication check
    // todo: check if useless
    const user = req.context.user;
    if (!user) {
      return res.status(401).send('User not connected');
    }

    const email = await generateEmail(req, res);

    if (req.body.files) {
      // Folder of the attachments uploaded through POST /email/files: must stay inside the attachments folder
      const folderPath = resolveAttachmentPath(req.body.files);
      if (!folderPath) {
        return res
          .status(400)
          .send(i18next.t('routes.email.errors.invalidAttachmentsFolder'));
      }
      const folderName = path.basename(folderPath);
      const blobs = await listFolderFiles('temp', folderName);
      const promises: Promise<any>[] = [];
      for (const blob of blobs) {
        const blobPath = resolveAttachmentPath(blob.name);
        if (blobPath) {
          promises.push(downloadFile('temp', blob.name, blobPath));
        }
      }
      await Promise.all(promises);
      await new Promise((resolve, reject) => {
        fs.readdir(folderPath, async (err, files) => {
          if (err) {
            reject(err);
          }
          for (const file of files) {
            await new Promise((resolve2, reject2) => {
              fs.readFile(path.join(folderPath, file), (err2, data) => {
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
            fs.rm(folderPath, { recursive: true }, (err2) => {
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
      logger.error(err.message, { stack: err.stack });
      return res
        .status(400)
        .send({ status: 'SMTP server failed to send the email', error: err });
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Save email attachments in a dedicated folder.
 */
router.post('/files', async (req: any, res) => {
  try {
    // Authentication check
    // todo: check if useless
    const user = req.context.user;
    if (!user) {
      return res.status(401).send('User not connected');
    }
    // Check file
    if (!req.files || Object.keys(req.files.attachments).length === 0)
      return res.status(400).send(i18next.t('routes.email.errors.missingFile'));

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
      return res
        .status(400)
        .send(i18next.t('common.errors.fileTotalSizeLimitReached'));
    }

    // Folder name where files will be stored
    const folderName = uuidv4();

    try {
      // Loop on files, to upload them
      for (const file of files) {
        // Check file size
        if (file.size > FILE_SIZE_LIMIT) {
          return res
            .status(400)
            .send(i18next.t('common.errors.fileSizeLimitReached'));
        } else {
          await uploadFile('temp', folderName, file, {
            filename: `${folderName}/${sanitize(file.name)}`,
            skipExtension: true,
          }).then(() => {
            logger.info(`Stored file ${file.name}`);
          });
        }
      }
    } catch (err) {
      // Specific try / catch so we can know what the error is
      logger.error(err.message, { stack: err.stack });
      return res.status(500).send(err.message);
    }

    // Return id of folder
    return res.json({ id: folderName });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/** Create a preview of the email for grids */
router.post('/preview', async (req, res) => {
  try {
    // Authentication check
    // todo: check if useless
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
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
