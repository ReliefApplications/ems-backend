import { ApiConfiguration, Form } from '@models';
import { logger } from '../services/logger.service';
import { CronJob } from 'cron';
import { get } from 'lodash';
import * as cronValidator from 'cron-validator';
import { KoboDataExtractor } from '@utils/form/kobo/KoboDataExtractor';

/** A map with the task ids as keys and the scheduled tasks as values */
const taskMap: Record<string, CronJob> = {};

/**
 * Global function called on server start to initialize all the pullJobs.
 */
const koboSyncScheduler = async () => {
  const forms = await Form.find({
    $and: [
      { 'kobo.cronSchedule': { $ne: null } },
      { 'kobo.cronSchedule': { $ne: '' } },
    ],
  }).populate('kobo.apiConfiguration');
  for (const form of forms) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    scheduleKoboSync(form);
  }
};

export default koboSyncScheduler;

/**
 * Unschedule an existing kobo form schedule synchronization from its id.
 *
 * @param form form to unschedule
 */
export const unscheduleKoboSync = (form: Form): void => {
  const task = taskMap[form.id];
  if (task) {
    task.stop();
    delete taskMap[form.id];
    logger.info(
      `📆 Unscheduled synchronization from Kobo of the form  ${
        form.name ? form.name : form.id
      }`
    );
  }
};

/**
 * Schedule or re-schedule the synchronization of the kobo data submissions for a form.
 *
 * @param form form to schedule records data synchronization
 */
export const scheduleKoboSync = async (form: Form) => {
  try {
    const task = taskMap[form.id];
    if (task) {
      task.stop();
    }
    form.kobo.apiConfiguration = await ApiConfiguration.findById(
      form.kobo.apiConfiguration
    );
    const schedule = get(form, 'kobo.cronSchedule', '');
    if (schedule) {
      if (cronValidator.isValidCron(schedule)) {
        taskMap[form.id] = new CronJob(
          form.kobo.cronSchedule,
          async () => {
            // call addRecordsFromKobo.mutation
            try {
              const koboExtractor = new KoboDataExtractor(form);
              const { added, updated } = await koboExtractor.sync();
              const addedRecords = added + updated > 0;

              if (addedRecords) {
                logger.info(
                  '📅 Imported Kobo data on scheduled synchronization for form: ' +
                    form.name
                );
              } else {
                logger.info(
                  '📅 Nothing to import from Kobo on scheduled synchronization for form: ' +
                    form.name
                );
              }
            } catch (error) {
              logger.info(
                '📅 Error on trying to import Kobo data on scheduled synchronization for form "' +
                  form.name +
                  '". Error: ' +
                  error
              );
            }
          },
          null,
          true
        );
        logger.info(
          '📅 Scheduled Kobo entries synchronization for form: ' + form.name
        );
      } else {
        throw new Error(`[${form.name}] Invalid schedule: ${schedule}`);
      }
    } else if (task) {
      unscheduleKoboSync(form);
    }
  } catch (err) {
    logger.error(err.message);
  }
};
