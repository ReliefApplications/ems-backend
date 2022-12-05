import { Application, CustomNotification } from '@models';
import cron from 'node-cron';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import { sendEmail } from '@utils/email';

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
            await sendEmail({
              message: {
                to: ['ketan.reliefapps@gmail.com'],
                subject: `Test - Your data export is completed `, // TODO : put in config for 1.3
                html: 'Dear colleague,\n\nPlease find attached to this e-mail the requested data export.\n\nFor any issues with the data export, please contact ems2@who.int\n\n Best regards,\nems2@who.int', // TODO : put in config for 1.3
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
