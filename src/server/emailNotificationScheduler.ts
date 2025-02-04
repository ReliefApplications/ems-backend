import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import axios from 'axios';
import config from 'config';
import { CronJob } from 'cron';
import * as cronValidator from 'cron-validator';

/**
 * Object to store Scheduled jobs
 */
const scheduledJobs: Record<string, CronJob> = {};

/**
 * Creates and manages cron job for executing scheduled tasks.
 *
 * @param schedule - cron schedule expression.
 * @param configId - emailNotification Id.
 */
export const createCronJob = (schedule, configId) => {
  // Validate the cron schedule before proceeding
  if (!cronValidator.isValidCron(schedule)) {
    logger.info(
      `Invalid cron schedule provided for ID: ${configId} -> ${schedule}`
    );
    return;
  }
  // If cronjob exists, stop and remove before creating new one
  if (scheduledJobs[configId]) {
    scheduledJobs[configId].stop();
    delete scheduledJobs[configId];
  }

  const cronJob = new CronJob(
    schedule,
    async () => {
      try {
        // Need to generate token to pass with send-email azure call
        const token = '';
        const requestConfig = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            accesstoken: token,
          },
          params: {
            code: config.get('email.serverless.key'),
          },
        };

        await axios.get(
          `${config.get('email.serverless.url')}/api/send-email/${configId}`,
          requestConfig
        );
      } catch (error) {
        logger.error(error.message);
      }
    },
    null,
    true
  );

  scheduledJobs[configId] = cronJob;
  logger.info(
    `📅 Scheduled Email notification job for ID: ${configId} at ${schedule}`
  );
};

/**
 * If EmailNotification is deleted then delete cronJob if scheduled
 *
 * @param notificationId emailNotification Id
 */
export const deleteCronJob = (notificationId) => {
  if (scheduledJobs[notificationId]) {
    scheduledJobs[notificationId].stop();
    delete scheduledJobs[notificationId];
    logger.info(`📆 Unscheduled Email notification job ${notificationId}`);
  }
};

/**
 * schedule email notifications with schedules on server start/restart
 */
export const emailNotificationScheduler = async () => {
  try {
    const emailNotifications = await EmailNotification.find({
      schedule: { $exists: true, $nin: ['', null] },
      isDeleted: { $ne: 1 },
    }).exec();

    emailNotifications.forEach((email) => {
      const schedule = email.schedule;
      const configId = email._id;

      createCronJob(schedule, configId);
    });
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    throw error;
  }
};
