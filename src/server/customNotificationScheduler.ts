import {
  Application,
  CustomNotification,
  Resource,
  Record,
  User,
} from '@models';
import cron from 'node-cron';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import { sendEmail, preprocess } from '@utils/email';

/** A map with the custom notification ids as keys and the scheduled custom notification as values */
const customNotificationMap = {};

/**
 * Global function called on server start to initialize all the custom notification.
 */
const customNotificationScheduler = async () => {
  const applicationList = await Application.find({
    customNotifications: { $elemMatch: { status: 'pending' } },
  });

  for (const applicationDetail of applicationList) {
    if (!!applicationDetail.customNotifications) {
      for await (const notificationDetail of applicationDetail.customNotifications) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        scheduleCustomNotificationJob(notificationDetail, applicationDetail);
      }
    }
  }
};

export default customNotificationScheduler;


/**
 * Send email for custom notification
 *
 * @param template email template after dataset replace
 * @param to custom notification receipts
 * @param custNotification custom notification detail
 */
const customNotificationMailSend = async (template, to, custNotification) => {
  console.log('to ==>> ', to);
  if (!!template && to.length > 0) {
    await sendEmail({
      message: {
        to: to,
        subject: template.name,
        html: template.content,
        attachments: [],
      },
    });
  } else {
    throw new Error(
      `[${custNotification.name}] notification email template not available or recipients not available:`
    );
  }
};

/**
 * Schedule or re-schedule a custom notification.
 *
 * @param custNotification custom notification to schedule
 * @param applicationDetail application's custom notification to schedule
 */
export const scheduleCustomNotificationJob = async (
  custNotification: CustomNotification,
  applicationDetail: Application
) => {
  try {
    const task = customNotificationMap[custNotification.id];
    if (task) {
      task.stop();
    }
    const schedule = get(custNotification, 'schedule', '');
    if (cronValidator.isValidCron(schedule)) {
      customNotificationMap[custNotification.id] = cron.schedule(
        custNotification.schedule,
        async () => {
          try {
            const templateDetail = applicationDetail.templates.find(
              (template) =>
                template._id.toString() === custNotification.template.toString()
            );

            let to: string[] = [];
            let userField = '';
            if (!!custNotification.recipients.distribution) {
              const distributionDetail =
                applicationDetail.distributionLists.find(
                  (distribution) =>
                    distribution._id.toString() ===
                    custNotification.recipients.distribution.toString()
                );
              to = !!distributionDetail.emails ? distributionDetail.emails : [];
            } else if (!!custNotification.recipients.single_email) {
              to = [custNotification.recipients.single_email];
            } else if (!!custNotification.recipients.userField) {
              userField = custNotification.recipients.userField;
            }

            const resourceDetail = await Resource.findOne({
              _id: custNotification.resource,
            });
            if (resourceDetail) {
              const layoutDetail = resourceDetail.layouts.find(
                (layout) =>
                  layout._id.toString() === custNotification.layout.toString()
              );

              const fieldArr = [];
              for (const field of resourceDetail.fields) {
                const layoutField = layoutDetail.query.fields.find(
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
              const recordsList = await Record.find({
                resource: custNotification.resource,
              });

              const recordListArr = [];
              for (const record of recordsList) {
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
                const templateContent = templateDetail.content;
                for await (const groupRecord of groupRecordArr) {
                  if (groupRecord.length > 0) {
                    templateDetail.content = await preprocess(templateContent, {
                      fields: fieldArr,
                      rows: groupRecord,
                    });
                  }

                  const userDetail = await User.findById(groupValArr[d]);
                  if (!!userDetail && !!userDetail.username) {
                    to = [userDetail.username];
                    await customNotificationMailSend(
                      templateDetail,
                      to,
                      custNotification
                    );
                  }
                  d++;
                }
              } else {
                templateDetail.content = await preprocess(
                  templateDetail.content,
                  {
                    fields: fieldArr,
                    rows: recordListArr,
                  }
                );
                await customNotificationMailSend(
                  templateDetail,
                  to,
                  custNotification
                );
              }
            } else {
              await customNotificationMailSend(
                templateDetail,
                to,
                custNotification
              );
            }

            const update = {
              $set: {
                'customNotifications.$.status': 'archived',
                'customNotifications.$.lastExecutionStatus': 'success',
                'customNotifications.$.lastExecution': new Date(),
              },
            };
            await Application.findOneAndUpdate(
              {
                _id: applicationDetail._id,
                'customNotifications._id': custNotification._id,
              },
              update
            );
          } catch (error) {
            logger.error(error.message, { stack: error.stack });
          }
        }
      );
      logger.info(
        '📅 Scheduled custom notification job ' + custNotification.name
      );
    } else {
      throw new Error(
        `[${custNotification.name}] Invalid custom notification schedule: ${schedule}`
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
