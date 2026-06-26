import express from 'express';
import { logger } from '@services/logger.service';
import { EmailNotification, Notification, User } from '@models';
import { azureFunctionHeaders } from '@utils/notification/util';
import i18next from 'i18next';
import axios from 'axios';
import config from 'config';
import pubsub from '@server/pubsub';

/**
 * Send email using SMTP email client
 */
const router = express.Router();

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

/**
 * After sending an email notification, create in-app notifications for any
 * recipient (To/Cc/Bcc) who is also a registered user.
 *
 * @param configId EmailNotification document id
 * @param html Rendered HTML body returned by the Azure function
 */
const createInAppNotificationsForEmailRecipients = async (
  configId: string,
  html: string
): Promise<void> => {
  try {
    const emailNotif = await EmailNotification.findById(configId)
      .select('name recipients subscriptionList')
      .lean()
      .exec();
    if (!emailNotif) return;

    // Collect all recipient addresses: pre-resolved To/Cc/Bcc + opt-in list
    const recipientEmails = [
      ...(emailNotif.recipients?.To ?? []),
      ...(emailNotif.recipients?.Cc ?? []),
      ...(emailNotif.recipients?.Bcc ?? []),
      ...(emailNotif.subscriptionList ?? []),
    ];

    if (!recipientEmails.length) return;

    const uniqueEmails = [...new Set(recipientEmails)];
    const users = await User.find({ username: { $in: uniqueEmails } }).select(
      '_id'
    );

    if (!users.length) return;

    const subject = emailNotif.name;
    const publisher = await pubsub();
    for (const user of users) {
      const notification = new Notification({
        action: subject,
        content: { emailNotificationId: configId, subject, html },
        user: user._id,
        seenBy: [],
      });
      await notification.save();
      publisher.publish(`user:${String(user._id)}`, { notification });
    }
  } catch (err) {
    logger.error(
      `Failed to create in-app notifications for email ${configId}: ${err.message}`,
      { stack: err.stack }
    );
  }
};

/** Function names that actually send emails (not previews) */
const EMAIL_SEND_FUNCTIONS = new Set([
  'send-email',
  'send-individual-email',
  'send-quick-email',
]);

/**
 * Redirect POST request to Azure function
 */
router.post('/:functionName/:configId?', async (req, res) => {
  try {
    const { functionName, configId } = req.params;

    const requestConfig = {
      headers: azureFunctionHeaders(req),
      params: {
        code: config.get('email.serverless.key'),
      },
    };

    const response = await axios.post(
      `${config.get('email.serverless.url')}/${functionName}/${configId || ''}`,
      req.body,
      requestConfig
    );
    res.status(200).send(response.data);

    // Fire-and-forget: create in-app notifications for email recipients
    if (configId && EMAIL_SEND_FUNCTIONS.has(functionName)) {
      const html = typeof response.data === 'string' ? response.data : '';
      createInAppNotificationsForEmailRecipients(configId, html);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Redirect GET request to Azure function
 */
router.get('/:functionName/:configId?', async (req, res) => {
  try {
    const { functionName, configId } = req.params;

    const requestConfig = {
      headers: azureFunctionHeaders(req),
      params: {
        code: config.get('email.serverless.key'),
      },
    };

    const response = await axios.get(
      `${config.get('email.serverless.url')}/${functionName}/${configId || ''}`,
      requestConfig
    );

    res.status(200).send(response.data);

    // Fire-and-forget: create in-app notifications for GET-triggered email sends
    if (configId && EMAIL_SEND_FUNCTIONS.has(functionName)) {
      const html = typeof response.data === 'string' ? response.data : '';
      createInAppNotificationsForEmailRecipients(configId, html);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
