import {
  Application,
  CustomNotification,
  Resource,
  Record as RecordModel,
  Notification,
  User,
  Channel,
} from '@models';
import { CronJob } from 'cron';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import { sendEmail, preprocess } from '@utils/email';
import {
  customNotificationRecipientsType,
  customNotificationType,
} from '@const/enumTypes';
import pubsub from './pubsub';
import getFilter from '@utils/schema/resolvers/Query/getFilter';

/** A map with the custom notification ids as keys and the scheduled custom notification as values */
const customNotificationMap: Record<string, CronJob> = {};

/**
 * Global function called on server start to initialize all the custom notification.
 */
const customNotificationScheduler = async () => {
  const applications = await Application.find({
    customNotifications: { $elemMatch: { status: 'active' } },
  });
  for (const application of applications) {
    if (!!application.customNotifications) {
      for await (const notification of application.customNotifications) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        scheduleCustomNotificationJob(notification, application);
      }
    }
  }
};

export default customNotificationScheduler;

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
    // console.log('content: ', template, template.content);
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
 * Depending on  notification type,  for custom notification
 *
 * @param content template content
 * @param notificationType notification type
 * @param fields fields to process
 * @param rows data of records rows
 */
const processTemplateContent = async (
  content,
  notificationType,
  fields,
  rows
) => {
  if (notificationType === customNotificationType.email) {
    content.body = await preprocess(content.body, {
      fields,
      rows,
    });
    content.subject = await preprocess(content.subject, {
      fields,
      rows,
    });
  } else {
    content.title = await preprocess(content.title, {
      fields,
      rows,
    });
    content.description = await preprocess(content.description, {
      fields,
      rows,
    });
  }
  return content;
};

/**
 * Send email for custom notification
 *
 * @param template processed email template
 * @param recipients custom notification recipients (form id or users from user field)
 * @param notification custom notification
 */
const customNotificationNotificationSend = async (
  template,
  recipients,
  notification
) => {
  if (!!template && !!recipients) {
    if (
      notification.recipientsType === customNotificationRecipientsType.channel
    ) {
      // Send notification to channel
      const channel = await Channel.findById(recipients[0]);
      if (channel) {
        // const content = JSON.parse(template.content);
        // console.log('TEM channel', template.content.title, channel.id);
        const notificationInstance = new Notification({
          action: template.content.title,
          content: template.content.description,
          //createdAt: new Date(),
          channel: channel.id,
          seenBy: [],
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
 */
const customNotificationSend = async (template, recipients, notification) => {
  if (!!template && recipients.length > 0) {
    const notificationType = get(notification, 'notificationType', 'email');
    if (notificationType === customNotificationType.email) {
      // console.log('customNotificationMailSend');
      // If custom notification type is email
      await customNotificationMailSend(template, recipients, notification);
    } else {
      // console.log('customNotificationNotificationSend');
      // If custom notification type is notification
      await customNotificationNotificationSend(
        template,
        recipients,
        notification
      );
    }
  } else {
    throw new Error(
      `[${notification.name}] notification template not available or recipients not available:`
    );
  }
};

/**
 * Schedule or re-schedule a custom notification.
 *
 * @param notification custom notification to schedule
 * @param application application's custom notification to schedule
 */
export const scheduleCustomNotificationJob = async (
  notification: CustomNotification,
  application: Application
) => {
  try {
    // console.log('scheduleCustomNotificationJob');
    const task = get(customNotificationMap, notification.id, null);
    if (task) {
      task.stop();
    }
    const schedule = get(notification, 'schedule', '');
    if (schedule) {
      if (cronValidator.isValidCron(schedule)) {
        customNotificationMap[notification.id] = new CronJob(
          notification.schedule,
          async () => {
            try {
              const template = application.templates.find(
                (x) => x._id.toString() === notification.template.toString()
              );

              const notificationType = get(
                notification,
                'notificationType',
                'email'
              );

              let recipients: string[] = [];
              let userField = '';
              let emailField = '';
              switch (notification.recipientsType) {
                // Use single email as recipients
                case customNotificationRecipientsType.email: {
                  recipients = [notification.recipients];
                  break;
                }
                // Use distribution list as recipients
                case customNotificationRecipientsType.distributionList: {
                  const distribution = application.distributionLists.find(
                    (x) => x._id.toString() === notification.recipients
                  );
                  recipients = get(distribution, 'emails', []);
                  break;
                }
                // Use dataset user question field as recipients
                case customNotificationRecipientsType.userField: {
                  userField = notification.recipients;
                  break;
                }
                // Use dataset email question field as recipients
                case customNotificationRecipientsType.emailField: {
                  emailField = notification.recipients;
                  break;
                }
                // Use channel as recipients
                case customNotificationRecipientsType.channel: {
                  recipients = [notification.recipients];
                  break;
                }
              }

              const resource = await Resource.findOne({
                _id: notification.resource,
              });
              if (resource) {
                const layout = resource.layouts.find(
                  (x) => x._id.toString() === notification.layout.toString()
                );

                const fieldArr = [];
                for (const field of resource.fields) {
                  const layoutField = layout.query.fields.find(
                    (fieldDetail) => fieldDetail.name == field.name
                  );

                  if (field.type != 'users') {
                    const obj = {
                      name: field.name,
                      field: field.name,
                      type: field.type,
                      meta: {
                        field: field,
                      },
                      title: layoutField?.label || layoutField?.name,
                    };
                    fieldArr.push(obj);
                  }
                }
                // If triggers, check if has filters
                let mongooseFilter = {};
                if (notification.applicationTrigger) {
                  const triggersFilters = resource.triggersFilters.find(
                    (tg: any) => tg.application === application.id
                  );
                  if (
                    triggersFilters &&
                    Object.prototype.hasOwnProperty.call(
                      triggersFilters,
                      'cronBased'
                    )
                  ) {
                    // TODO: fix always returning empty {}
                    // Filter from the query definition
                    mongooseFilter = getFilter(
                      triggersFilters.cronBased,
                      resource.fields
                    );
                  }
                }
                // console.log('--- mongooseFilter: ', mongooseFilter);
                const records = await RecordModel.aggregate([
                  {
                    $match: {
                      $and: [
                        {
                          resource: notification.resource,
                        },
                        mongooseFilter,
                      ],
                    },
                  },
                ]);

                const recordListArr = [];
                for (const record of records) {
                  if (record.data) {
                    Object.keys(record.data).forEach(function (key) {
                      record.data[key] =
                        typeof record.data[key] == 'object'
                          ? record.data[key]?.join(',')
                          : record.data[key];
                    });
                    recordListArr.push({ ...record.data, id: record._id });
                  }
                }

                if (!!userField || !!emailField) {
                  const field = userField || emailField;
                  const groupRecordArr = [];
                  const groupValArr = [];
                  for (const record of recordListArr) {
                    const index = groupValArr.indexOf(record[field]);
                    if (index == -1) {
                      groupValArr.push(record[field]);
                      delete record[field];
                      groupRecordArr.push([record]);
                    } else {
                      delete record[field];
                      groupRecordArr[index].push(record);
                    }
                  }

                  let d = 0;
                  for await (const groupRecord of groupRecordArr) {
                    if (groupRecord.length > 0) {
                      template.content = await processTemplateContent(
                        template.content,
                        notificationType,
                        fieldArr,
                        groupRecord
                      );
                      // console.log('template.content: ', template.content);
                    }
                    if (!!userField) {
                      // If using userField, get the user with the id saved in the record data
                      const userDetail = await User.findById(groupValArr[d]);
                      if (!!userDetail && !!userDetail.username) {
                        if (notificationType === customNotificationType.email) {
                          // If email type, should get user email
                          recipients = [userDetail.username];
                          await customNotificationSend(
                            template,
                            recipients,
                            notification
                          );
                        } else {
                          // If notification type, should get user id
                          recipients = userDetail.id;
                          await customNotificationSend(
                            template,
                            recipients,
                            notification
                          );
                        }
                      }
                    } else {
                      // If using emailField, get the email saved in the record data
                      recipients = groupValArr[d];
                      await customNotificationSend(
                        template,
                        recipients,
                        notification
                      );
                    }
                    d++;
                  }
                } else {
                  template.content = await processTemplateContent(
                    template.content,
                    notificationType,
                    fieldArr,
                    recordListArr
                  );
                  // console.log('template.content: ', template.content);
                  await customNotificationSend(
                    template,
                    recipients,
                    notification
                  );
                }
              } else {
                await customNotificationSend(
                  template,
                  recipients,
                  notification
                );
              }

              const update = {
                $set: {
                  'customNotifications.$.lastExecutionStatus': 'success',
                  'customNotifications.$.lastExecution': new Date(),
                },
              };
              await Application.findOneAndUpdate(
                {
                  _id: application._id,
                  'customNotifications._id': notification._id,
                },
                update
              );
            } catch (error) {
              logger.error(error.message, { stack: error.stack });
            }
          },
          null,
          true
        );
        logger.info(
          '📅 Scheduled custom notification job ' + notification.name
        );
      } else {
        throw new Error(
          `[${notification.name}] Invalid custom notification schedule: ${schedule}`
        );
      }
    } else if (task) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      unscheduleCustomNotificationJob(notification);
    }
  } catch (err) {
    logger.error(err.message);
  }
};

/**
 * Unschedule an existing custom notification from its id.
 *
 * @param customNotification custom notification to unschedule
 */
export const unscheduleCustomNotificationJob = (
  customNotification: CustomNotification
): void => {
  const task = customNotificationMap[customNotification.id];
  if (task) {
    task.stop();
    logger.info(
      `📆 Unscheduled custom notification job ${
        customNotification.name
          ? customNotification.name
          : customNotification.id
      }`
    );
  }
};
