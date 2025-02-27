import { EmailNotificationAttachment } from '@models/emailNotification.model';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import axios from 'axios';
import config from 'config';

/**
 * Returns headers required for Azure Function
 *
 * @param req Caller's express request
 * @returns headers
 */
export const azureFunctionHeaders = (req: any) => {
  return {
    Authorization: req.headers.authorization,
    'Content-Type': 'application/json',
    ...(req.headers.accesstoken && {
      accesstoken: req.headers.accesstoken,
    }),
  };
};

/**
 * Deletes files from document management
 *
 * @param attachments - attachment details, including file info and whether to send as an attachment.
 * @param context - context from GraphQL resolver, used to get accesstoken
 * @returns promise that resolves when the files have been deleted.
 */
export async function deleteFile(
  attachments: EmailNotificationAttachment,
  context: Context
) {
  if (
    !attachments.files ||
    attachments.files.length === 0 ||
    !context.accesstoken
  ) {
    return;
  }

  const attachmentRequests = attachments.files.map(async (file) => {
    const { driveId, itemId, fileName } = file;

    try {
      if (attachments.sendAsAttachment) {
        await axios.delete(
          `${config.get(
            'commonServices.url'
          )}/documents/drives/${driveId}/items/${itemId}`,
          {
            headers: {
              Authorization: `Bearer ${context.accesstoken}`,
            },
          }
        );
      }
    } catch (error) {
      logger.error(`Failed to delete file: ${fileName}`, error.message);
    }
  });

  await Promise.all(attachmentRequests);
}
