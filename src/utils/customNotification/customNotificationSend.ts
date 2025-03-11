import {
  customNotificationRecipientsType,
  customNotificationType,
} from '@const/enumTypes';
import { Channel, Notification } from '@models';
import pubsub from '@server/pubsub';
import { sendEmail } from '@utils/email';
import { get } from 'lodash';

/**
 * Send email for custom notification
 *
 * @param template processed email template
 * @param recipients custom notification recipients
 * @param notification custom notification
 */
const customNotificationMailSend = async (
  template,
  recipients,
  notification
) => {
  if (!!template && recipients.length > 0) {
    await sendEmail({
      message: {
        to: recipients,
        subject: template.content.subject,
        html: template.content.body,
        attachments: [],
      },
    });
  } else {
    throw new Error(
      `[${notification.name}] notification email template not available or recipients not available:`
    );
  }
};

/**
 * Send email for custom notification
 *
 * @param template processed email template
 * @param recipients custom notification recipients (form id or users from user field)
 * @param notification custom notification
 * @param recordsIds records ids list (if any)
 */
const notificationSend = async (
  template,
  recipients,
  notification,
  recordsIds
) => {
  if (!!template && !!recipients) {
    const redirect =
      notification.redirect && notification.redirect.active
        ? {
            ...notification.redirect,
            recordIds: recordsIds,
            layout: notification.layout,
            resource: notification.resource,
          }
        : null;
    if (
      notification.recipientsType === customNotificationRecipientsType.channel
    ) {
      // Send notification to channel
      const channel = await Channel.findById(recipients[0]);
      if (channel) {
        const notificationInstance = new Notification({
          action: template.content.title,
          content: template.content.description,
          //createdAt: new Date(),
          channel: channel.id,
          seenBy: [],
          redirect,
        });
        await notificationInstance.save();
        const publisher = await pubsub();
        publisher.publish(channel.id, { notificationInstance });
      }
    } else if (
      notification.recipientsType === customNotificationRecipientsType.userField
    ) {
      // Send notification to a user
      const notificationInstance = new Notification({
        action: template.content.title,
        content: template.content.description,
        //createdAt: new Date(),
        user: recipients,
        seenBy: [],
        redirect,
      });
      await notificationInstance.save();
      const publisher = await pubsub();
      publisher.publish(recipients, { notificationInstance });
    }
  } else {
    throw new Error(
      `[${notification.name}] notification template not available or recipients not available:`
    );
  }
};

/**
 * Prepare custom notification to be sent by type (email or notification)
 *
 * @param template processed email template
 * @param recipients custom notification recipients (always a array)
 * (can be a single email, a list of emails, a channel id or users from a user field)
 * @param notification custom notification
 * @param recordsIds records ids list
 */
export default async (
  template,
  recipients,
  notification,
  recordsIds?: string[]
) => {
  if (!!template && recipients.length > 0) {
    const notificationType = get(notification, 'notificationType', 'email');
    if (notificationType === customNotificationType.email) {
      // If custom notification type is email
      await customNotificationMailSend(template, recipients, notification);
    } else {
      // If custom notification type is notification
      await notificationSend(template, recipients, notification, recordsIds);
    }
  } else {
    throw new Error(
      `[${notification.name}] notification template not available or recipients not available:`
    );
  }
};
