import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import axios from 'axios';
import config from 'config';
import { CronJob } from 'cron';
import * as cronValidator from 'cron-validator';
import { getAzureFunctionTokens } from '@utils/notification/schedulerAuth';

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
  const id = String(configId);
  if (scheduledJobs[id]) {
    scheduledJobs[id].stop();
    delete scheduledJobs[id];
  }

  const cronJob = new CronJob(
    schedule,
    async () => {
      try {
        const { authorization, accesstoken } = await getAzureFunctionTokens();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authorization) headers.Authorization = `Bearer ${authorization}`;
        if (accesstoken) headers.accesstoken = accesstoken;
        await axios.get(
          `${config.get('email.serverless.url')}/api/send-email/${id}`,
          {
            headers,
            params: {
              code: config.get('email.serverless.key'),
            },
          }
        );

        await EmailNotification.findByIdAndUpdate(id, {
          $set: { lastExecution: new Date(), lastExecutionStatus: 'success' },
        }).exec();
      } catch (error) {
        logger.error(`Scheduled email failed for ${id}: ${error.message}`, {
          stack: error.stack,
        });
        await EmailNotification.findByIdAndUpdate(id, {
          $set: { lastExecution: new Date(), lastExecutionStatus: 'failed' },
        }).exec();
      }
    },
    null,
    true
  );

  scheduledJobs[id] = cronJob;
  logger.info(
    `📅 Scheduled Email notification job for ID: ${id} at ${schedule})`
  );
};

/**
 * If EmailNotification is deleted then delete cronJob if scheduled
 *
 * @param notificationId emailNotification Id
 */
export const deleteCronJob = (notificationId) => {
  const id = String(notificationId);
  if (scheduledJobs[id]) {
    scheduledJobs[id].stop();
    delete scheduledJobs[id];
    logger.info(`📆 Unscheduled Email notification job ${id}`);
  }
};

/**
 * schedule email notifications with schedules on server start/restart
 */
export const emailNotificationScheduler = async () => {
  try {
    const emailNotifications = await EmailNotification.find({
      'schedule.cronValue': { $exists: true, $nin: ['', null] },
      isDeleted: { $ne: 1 },
    }).exec();

    emailNotifications.forEach((email) => {
      if (email.schedule?.scheduleEnabled && email.schedule?.cronValue) {
        createCronJob(email.schedule.cronValue, email._id.toString());
      }
    });
  } catch (error) {
    logger.error('Error fetching scheduled emails:', error);
    throw error;
  }
};
