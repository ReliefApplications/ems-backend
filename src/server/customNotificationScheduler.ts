import { Application, CustomNotification, Resource, Record } from '@models';
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

              templateDetail.content = preprocess(templateDetail.content, {
                fields: fieldArr,
                rows: recordListArr,
              });
            }

            if (!!templateDetail && to.length > 0) {
              await sendEmail({
                message: {
                  to: to,
                  subject: templateDetail.name,
                  html: templateDetail.content,
                  attachments: [],
                },
              });

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
            } else {
              throw new Error(
                `[${custNotification.name}] notification email template not available or recipients not available:`
              );
            }
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
