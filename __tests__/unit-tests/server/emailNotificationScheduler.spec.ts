import axios from 'axios';
import { CronJob } from 'cron';
import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import { getAzureFunctionTokens } from '@utils/notification/schedulerAuth';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/** Shared stop spy for every mocked cron job instance. */
const mockStop = jest.fn();

// node-cron jobs are mocked: the scheduler's tick callback is captured from
// the constructor call and fired manually, no real timer runs.
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({ stop: mockStop })),
}));

// The serverless function app is never called for real.
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

// Token minting is covered by schedulerAuth.spec.ts; here it only feeds headers.
jest.mock('@utils/notification/schedulerAuth', () => ({
  getAzureFunctionTokens: jest.fn(),
}));

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      switch (setting) {
        case 'email.serverless.url':
          return 'https://functions.example.com/api';
        case 'email.serverless.key':
          return 'function-key';
        default:
          return originalConfig.get(setting);
      }
    }),
    util: originalConfig.util,
  };
});

import {
  createCronJob,
  deleteCronJob,
  emailNotificationScheduler,
} from '@server/emailNotificationScheduler';

/** Counter making notification names unique (name + applicationId is a unique index). */
let notificationCount = 0;

/**
 * Create a persisted email notification with a valid enabled schedule.
 *
 * @param overrides fields overriding the scheduled-notification defaults
 * @returns the persisted notification document
 */
const createNotification = async (overrides: Record<string, any> = {}) =>
  EmailNotification.create({
    name: `Scheduled notification ${++notificationCount}`,
    notificationType: 'email',
    isDraft: false,
    schedule: { scheduleEnabled: true, cronValue: '*/5 * * * *' },
    ...overrides,
  });

/** Get the tick callback captured by the latest CronJob construction. */
const getLatestTick = () => {
  const calls = (CronJob as unknown as jest.Mock).mock.calls;
  return calls[calls.length - 1][1] as () => Promise<void>;
};

describe('emailNotificationScheduler', () => {
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await EmailNotification.deleteMany({});
    (getAzureFunctionTokens as jest.Mock).mockResolvedValue({
      authorization: 'auth-token',
      accesstoken: 'cs-token',
    });
    (axios.get as jest.Mock).mockResolvedValue({ data: {} });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  describe('createCronJob', () => {
    it('should not schedule anything when the schedule is disabled', async () => {
      const notification = await createNotification({
        schedule: { scheduleEnabled: false, cronValue: '*/5 * * * *' },
      });

      createCronJob(notification);

      expect(CronJob).not.toHaveBeenCalled();
    });

    it('should not schedule anything when there is no cron value', async () => {
      const notification = await createNotification({
        schedule: { scheduleEnabled: true, cronValue: '' },
      });

      createCronJob(notification);

      expect(CronJob).not.toHaveBeenCalled();
    });

    it('should log and skip scheduling when the cron expression is invalid', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();
      const notification = await createNotification({
        schedule: { scheduleEnabled: true, cronValue: 'not a cron' },
      });

      createCronJob(notification);

      expect(CronJob).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cron schedule')
      );
    });

    it('should register a started cron job with the configured schedule', async () => {
      const notification = await createNotification();

      createCronJob(notification);

      expect(CronJob).toHaveBeenCalledTimes(1);
      expect(CronJob).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        null,
        true
      );
    });

    it('should stop and replace an existing job for the same notification', async () => {
      const notification = await createNotification();

      createCronJob(notification);
      createCronJob(notification);

      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(CronJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('scheduled job execution', () => {
    it('should call the send-email function and record a success', async () => {
      const notification = await createNotification({
        datasets: [{ name: 'ds', individualEmail: false }],
      });
      createCronJob(notification);

      await getLatestTick()();

      expect(axios.get).toHaveBeenCalledWith(
        `https://functions.example.com/api/send-email/${notification._id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer auth-token',
            accesstoken: 'cs-token',
          },
          params: { code: 'function-key' },
        }
      );
      expect(axios.post).not.toHaveBeenCalled();

      const updated = await EmailNotification.findById(notification._id);
      expect(updated.lastExecutionStatus).toBe('success');
      expect(updated.lastExecution).toBeInstanceOf(Date);
    });

    it('should call send-individual-email when any dataset sends separate emails', async () => {
      const notification = await createNotification({
        datasets: [
          { name: 'combined', individualEmail: false },
          { name: 'separate', individualEmail: true },
        ],
      });
      createCronJob(notification);

      await getLatestTick()();

      expect(axios.post).toHaveBeenCalledWith(
        `https://functions.example.com/api/send-individual-email/${notification._id}`,
        {},
        expect.objectContaining({ params: { code: 'function-key' } })
      );
      expect(axios.get).not.toHaveBeenCalled();

      const updated = await EmailNotification.findById(notification._id);
      expect(updated.lastExecutionStatus).toBe('success');
    });

    it('should omit auth headers when no tokens could be fetched', async () => {
      (getAzureFunctionTokens as jest.Mock).mockResolvedValue({});
      const notification = await createNotification();
      createCronJob(notification);

      await getLatestTick()();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should log and record an error when the function call fails', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
      (axios.get as jest.Mock).mockRejectedValue(new Error('function down'));
      const notification = await createNotification();
      createCronJob(notification);

      await getLatestTick()();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Scheduled email failed for ${notification._id}`
        ),
        expect.any(Object)
      );

      const updated = await EmailNotification.findById(notification._id);
      expect(updated.lastExecutionStatus).toBe('error');
      expect(updated.lastExecution).toBeInstanceOf(Date);
    });
  });

  describe('deleteCronJob', () => {
    it('should stop and unregister the job of the notification', async () => {
      const notification = await createNotification();
      createCronJob(notification);

      deleteCronJob(notification._id);

      expect(mockStop).toHaveBeenCalledTimes(1);

      // The job is gone from the registry: deleting again is a no-op.
      deleteCronJob(notification._id);
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for an id that was never scheduled', () => {
      deleteCronJob('000000000000000000000000');

      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('emailNotificationScheduler', () => {
    it('should only schedule enabled, non-deleted notifications with a cron value', async () => {
      const scheduled = await createNotification({
        schedule: { scheduleEnabled: true, cronValue: '0 9 * * 1' },
      });
      await createNotification({
        schedule: { scheduleEnabled: false, cronValue: '*/5 * * * *' },
      });
      await createNotification({
        schedule: { scheduleEnabled: true, cronValue: '' },
      });
      await createNotification({
        schedule: { scheduleEnabled: true, cronValue: '*/5 * * * *' },
        isDeleted: 1,
      });

      await emailNotificationScheduler();

      expect(CronJob).toHaveBeenCalledTimes(1);
      expect(CronJob).toHaveBeenCalledWith(
        '0 9 * * 1',
        expect.any(Function),
        null,
        true
      );
      // The registered tick targets the scheduled notification.
      await getLatestTick()();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(String(scheduled._id)),
        expect.any(Object)
      );
    });

    it('should log and rethrow when fetching the notifications fails', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
      const findSpy = jest.spyOn(EmailNotification, 'find').mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('db down')),
      } as any);

      await expect(emailNotificationScheduler()).rejects.toThrow('db down');
      expect(errorSpy).toHaveBeenCalledWith(
        'Error fetching scheduled emails:',
        expect.any(Error)
      );

      findSpy.mockRestore();
    });
  });
});
