import { ActivityLog } from '@models';
import {
  ActivityCreationAttributes,
  ActivityService,
} from '@routes/activity/activity.service';
import { logger } from '@services/logger.service';
import { Types } from 'mongoose';

jest.mock('@services/logger.service');

describe('Activity Service', () => {
  let service: ActivityService;

  beforeAll(() => {
    service = new ActivityService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create activity', () => {
    it('should create a new activity with valid input', async () => {
      const data: ActivityCreationAttributes = {
        user: {
          _id: '676149c37eb17e606b71c889',
          username: 'mock user',
          attributes: {},
        },
        eventType: 'navigation',
        metadata: {},
      };
      const createdActivity = {
        userId: new Types.ObjectId(data.user._id),
        username: data.user.username,
        eventType: data.eventType,
      };

      const createMock = jest.spyOn(ActivityLog.prototype, 'save');
      createMock.mockResolvedValueOnce(createdActivity);

      const result = await service.create(data);

      expect(result).toMatchObject(createdActivity);
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('should log an error and throw if activity save fails', async () => {
      const data: ActivityCreationAttributes = {
        user: {
          _id: '676149c37eb17e606b71c889',
          username: 'mock user',
          attributes: {},
        },
        eventType: 'navigation',
        metadata: {},
      };
      const error = new Error('Database error');

      const createMock = jest.spyOn(ActivityLog.prototype, 'save');
      createMock.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.create(data)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
      expect(createMock).toHaveBeenCalled();
    });
  });
});
