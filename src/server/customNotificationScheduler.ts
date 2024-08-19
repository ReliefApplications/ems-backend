import {
  Application,
  CustomNotification,
  Resource,
  Record as RecordModel,
  User,
} from '@models';
import { CronJob } from 'cron';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import { preprocess } from '@utils/email';
import {
  customNotificationRecipientsType,
  customNotificationType,
} from '@const/enumTypes';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import customNotificationSend from '@utils/customNotification/customNotificationSend';

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
              let sent = false;
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
                // If triggers check if has filters
                let mongooseFilter = {};
                if (
                  notification.applicationTrigger &&
                  notification.filter?.filters?.length
                ) {
                  // TODO: take into account resources questions
                  // Filter from the query definition
                  mongooseFilter = getFilter(
                    notification.filter,
                    resource.fields
                  );
                }
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

                if (records) {
                  const redirectToRecords =
                    notification.redirect &&
                    notification.redirect.active &&
                    notification.redirect.type === 'recordIds';
                  const recordsIds = [];
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
                      if (redirectToRecords) {
                        recordsIds.push(record._id);
                      }
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
                      }
                      if (!!userField) {
                        // If using userField, get the user with the id saved in the record data
                        const userDetail = await User.findById(groupValArr[d]);
                        if (!!userDetail && !!userDetail.username) {
                          if (
                            notificationType === customNotificationType.email
                          ) {
                            // If email type, should get user email
                            recipients = [userDetail.username];
                            await customNotificationSend(
                              template,
                              recipients,
                              notification
                            );
                            sent = true;
                          } else {
                            // If notification type, should get user id
                            recipients = userDetail.id;
                            await customNotificationSend(
                              template,
                              recipients,
                              notification,
                              recordsIds
                            );
                            sent = true;
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
                        sent = true;
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
                    await customNotificationSend(
                      template,
                      recipients,
                      notification,
                      recordsIds
                    );
                    sent = true;
                  }
                }
              } else {
                await customNotificationSend(
                  template,
                  recipients,
                  notification
                );
                sent = true;
              }

              if (sent) {
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
              }
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
