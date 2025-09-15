import { EmailNotification } from '@models';
import type { EmailNotification as EmailNotificationDoc } from '@models/emailNotification.model';
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
 * Creates and manages cron job for executing scheduled tasks for a notification.
 *
 * @param notification email notification document (includes schedule and datasets)
 */
export const createCronJob = (notification: EmailNotificationDoc) => {
  const id = String(notification._id);
  const schedule = notification?.schedule?.cronValue || '';
  const enabled = !!notification?.schedule?.scheduleEnabled;
  if (!enabled || !schedule) return;
  if (!cronValidator.isValidCron(schedule)) {
    logger.info(`Invalid cron schedule provided for ID: ${id} -> ${schedule}`);
    return;
  }
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
        // Choose function based on whether any dataset sends individual emails
        const hasIndividual = Array.isArray(notification?.datasets)
          ? notification.datasets.some((d: any) => d?.individualEmail === true)
          : false;
        const functionName = hasIndividual
          ? 'send-individual-email'
          : 'send-email';
        await axios.get(
          `${config.get('email.serverless.url')}/${functionName}/${id}`,
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
        createCronJob(email);
      }
    });
  } catch (error) {
    logger.error('Error fetching scheduled emails:', error);
    throw error;
  }
};
