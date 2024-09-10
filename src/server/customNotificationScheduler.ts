import {
  Application,
  CustomNotification,
  Resource,
  Record as RecordModel,
  User,
} from '@models';
import { CronJob } from 'cron';
import logger from '@lib/logger';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import { sendEmail, preprocess } from '@utils/email';
import { customNotificationRecipientsType } from '@const/enumTypes';

/** A map with the custom notification ids as keys and the scheduled custom notification as values */
const customNotificationMap: Record<string, CronJob> = {};

/**
 * Global function called on server start to initialize all the custom notification.
 */
const customNotificationScheduler = async () => {
  // const applications = await Application.find({
  //   customNotifications: { $elemMatch: { status: 'active' } },
  // });
  // for (const application of applications) {
  //   if (!!application.customNotifications) {
  //     for await (const notification of application.customNotifications) {
  //       // eslint-disable-next-line @typescript-eslint/no-use-before-define
  //       scheduleCustomNotificationJob(notification, application);
  //     }
  //   }
  // }
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
    await sendEmail({
      message: {
        to: recipients,
        subject: template.name,
        html: template.content,
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
    const task = get(customNotificationMap, notification.id, null);
    if (task) {
      task.stop();
    }
    const schedule = get(notification, 'schedule', '');
    if (cronValidator.isValidCron(schedule)) {
      customNotificationMap[notification.id] = new CronJob(
        notification.schedule,
        async () => {
          try {
            const template = application.templates.find(
              (x) => x._id.toString() === notification.template.toString()
            );

            let recipients: string[] = [];
            let userField = '';
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
              // Use dataset field as recipients
              case customNotificationRecipientsType.userField: {
                userField = notification.recipients;
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
                    title: layoutField.label,
                  };
                  fieldArr.push(obj);
                }
              }
              const records = await RecordModel.find({
                resource: notification.resource,
              });

              const recordListArr = [];
              for (const record of records) {
                if (record.data) {
                  Object.keys(record.data).forEach(function (key) {
                    record.data[key] =
                      typeof record.data[key] == 'object'
                        ? record.data[key].join(',')
                        : record.data[key];
                  });
                  recordListArr.push(record.data);
                }
              }

              if (!!userField) {
                const groupRecordArr = [];
                const groupValArr = [];
                for (const record of recordListArr) {
                  const index = groupValArr.indexOf(record[userField]);
                  if (index == -1) {
                    groupValArr.push(record[userField]);
                    delete record[userField];
                    groupRecordArr.push([record]);
                  } else {
                    delete record[userField];
                    groupRecordArr[index].push(record);
                  }
                }

                let d = 0;
                const templateContent = template.content;
                for await (const groupRecord of groupRecordArr) {
                  if (groupRecord.length > 0) {
                    template.content = await preprocess(templateContent, {
                      fields: fieldArr,
                      rows: groupRecord,
                    });
                  }

                  const userDetail = await User.findById(groupValArr[d]);
                  if (!!userDetail && !!userDetail.username) {
                    recipients = [userDetail.username];
                    await customNotificationMailSend(
                      template,
                      recipients,
                      notification
                    );
                  }
                  d++;
                }
              } else {
                template.content = preprocess(template.content, {
                  fields: fieldArr,
                  rows: recordListArr,
                });
                await customNotificationMailSend(
                  template,
                  recipients,
                  notification
                );
              }
            } else {
              await customNotificationMailSend(
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
      logger.info('📅 Scheduled custom notification job ' + notification.name);
    } else {
      throw new Error(
        `[${notification.name}] Invalid custom notification schedule: ${schedule}`
      );
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
