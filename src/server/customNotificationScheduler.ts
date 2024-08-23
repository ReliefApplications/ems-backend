import {
  Application,
  CustomNotification,
  Resource,
  Record as RecordModel,
} from '@models';
import { CronJob } from 'cron';
import { logger } from '../services/logger.service';
import * as cronValidator from 'cron-validator';
import get from 'lodash/get';
import getTriggerFilter from '@utils/customNotification/getTriggerFilter';
import processCustomNotification from '@utils/customNotification/processCustomNotification';

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
              const resource = await Resource.findOne({
                _id: notification.resource,
              });
              if (resource) {
                // If triggers check if has filters
                const mongooseFilter = getTriggerFilter(notification, resource);
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
                if (records.length) {
                  await processCustomNotification(
                    notification,
                    application,
                    resource,
                    records
                  );
                }
              } else {
                await processCustomNotification(notification, application);
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
