import { ActivityService } from '@routes/activity/activity.service';
import { ActivityLog } from '@models/activityLog.model';
import { logger } from '@services/logger.service';
import { Types } from 'mongoose';
import xlsBuilder from '@utils/files/xlsBuilder';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

jest.mock('@models/activityLog.model');
jest.mock('@services/logger.service');
jest.mock('@utils/files/xlsBuilder');
jest.mock('@security/defineUserAbility');
jest.mock('@security/extendAbilityForApplication');

describe('ActivityService', () => {
  let activityService: ActivityService;

  beforeEach(() => {
    activityService = new ActivityService();
  });

  describe('create', () => {
    it('should create and save a new activity', async () => {
      const mockActivity = {
        user: {
          _id: new Types.ObjectId(),
          username: 'testUser',
          attributes: {},
        },
        eventType: 'navigation',
        metadata: { url: '/test' },
      };

      const saveMock = jest.fn().mockResolvedValue(mockActivity);
      (ActivityLog as any).mockImplementation(() => ({ save: saveMock }));

      const result = await activityService.create(mockActivity);

      expect(result).toEqual(mockActivity);
      expect(saveMock).toHaveBeenCalled();
    });

    it('should log and throw an error if saving fails', async () => {
      const mockActivity = {
        user: {
          _id: new Types.ObjectId(),
          username: 'testUser',
          attributes: {},
        },
        eventType: 'navigation',
        metadata: { url: '/test' },
      };

      const error = new Error('Save failed');
      const saveMock = jest.fn().mockRejectedValue(error);
      (ActivityLog as any).mockImplementation(() => ({ save: saveMock }));

      await expect(activityService.create(mockActivity)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('list', () => {
    it('should return a list of activities', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const mockAggregation = [
        {
          items: [
            {
              _id: '1',
              userId: 'user1',
              username: 'testUser',
              createdAt: new Date(),
            },
          ],
          totalCount: 1,
        },
      ];

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockResolvedValue(mockAggregation),
      });

      const result = await activityService.list(mockQuery);

      expect(result).toEqual({
        items: mockAggregation[0].items,
        skip: 0,
        take: 10,
        total: 1,
      });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValue(error),
      });

      await expect(activityService.list(mockQuery)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('groupByUrl', () => {
    it('should return activities grouped by url', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const mockAggregation = [
        {
          items: [{ count: 1, metadata: { title: 'test' } }],
          totalCount: 1,
        },
      ];

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockResolvedValue(mockAggregation),
      });

      const result = await activityService.groupByUrl(mockQuery);

      expect(result).toEqual({
        items: mockAggregation[0].items,
        skip: 0,
        take: 10,
        total: 1,
      });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValue(error),
      });

      await expect(activityService.groupByUrl(mockQuery)).rejects.toThrow(
        error
      );
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('groupByUser', () => {
    it('should return activities grouped by user', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const mockAggregation = [
        {
          items: [{ count: 1, username: 'testUser', attributes: {} }],
          totalCount: 1,
        },
      ];

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockResolvedValue(mockAggregation),
      });

      const result = await activityService.groupByUser(mockQuery);

      expect(result).toEqual({
        items: mockAggregation[0].items,
        skip: 0,
        take: 10,
        total: 1,
      });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = { skip: 0, take: 10 };
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockReturnValue({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValue(error),
      });

      await expect(activityService.groupByUser(mockQuery)).rejects.toThrow(
        error
      );
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('downloadList', () => {
    it('should return a file buffer for list of activities', async () => {
      const mockQuery = { timeZone: 'UTC' };
      const mockAggregation = [
        {
          createdAt: new Date(),
          userId: 'user1',
          username: 'testUser',
          metadata: { title: 'test' },
          attributes: {},
        },
      ];
      const mockFile = Buffer.from('test');

      (ActivityLog.aggregate as any).mockResolvedValue(mockAggregation);
      (xlsBuilder as any).mockResolvedValue(mockFile);

      const result = await activityService.downloadList(mockQuery);

      expect(result).toEqual({ fileName: 'recent-hits.xlsx', file: mockFile });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = { timeZone: 'UTC' };
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockRejectedValue(error);

      await expect(activityService.downloadList(mockQuery)).rejects.toThrow(
        error
      );
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('downloadGroupByUrl', () => {
    it('should return a file buffer for activities grouped by url', async () => {
      const mockQuery = {};
      const mockAggregation = [{ count: 1, metadata: { title: 'test' } }];
      const mockFile = Buffer.from('test');

      (ActivityLog.aggregate as any).mockResolvedValue(mockAggregation);
      (xlsBuilder as any).mockResolvedValue(mockFile);

      const result = await activityService.downloadGroupByUrl(mockQuery);

      expect(result).toEqual({
        fileName: 'group-by-page.xlsx',
        file: mockFile,
      });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = {};
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockRejectedValue(error);

      await expect(
        activityService.downloadGroupByUrl(mockQuery)
      ).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('downloadGroupByUser', () => {
    it('should return a file buffer for activities grouped by user', async () => {
      const mockQuery = {};
      const mockAggregation = [
        { count: 1, username: 'testUser', attributes: {} },
      ];
      const mockFile = Buffer.from('test');

      (ActivityLog.aggregate as any).mockResolvedValue(mockAggregation);
      (xlsBuilder as any).mockResolvedValue(mockFile);

      const result = await activityService.downloadGroupByUser(mockQuery);

      expect(result).toEqual({
        fileName: 'group-by-user.xlsx',
        file: mockFile,
      });
    });

    it('should log and throw an error if aggregation fails', async () => {
      const mockQuery = {};
      const error = new Error('Aggregation failed');

      (ActivityLog.aggregate as any).mockRejectedValue(error);

      await expect(
        activityService.downloadGroupByUser(mockQuery)
      ).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
      });
    });
  });

  describe('checkPermission', () => {
    it('should throw an error if user does not have permission', () => {
      const mockUser = { ability: { cannot: jest.fn().mockReturnValue(true) } };

      expect(() => activityService.checkPermission(mockUser)).toThrow();
    });

    it('should not throw an error if user has permission', () => {
      const mockUser = {
        ability: { cannot: jest.fn().mockReturnValue(false) },
      };

      expect(() => activityService.checkPermission(mockUser)).not.toThrow();
    });

    it('should extend ability for applications and not throw an error if user has permission', () => {
      const mockUser = { ability: { cannot: jest.fn().mockReturnValue(true) } };
      const mockAppAbility = { can: jest.fn().mockReturnValue(true) };

      (extendAbilityForApplications as any).mockReturnValue(mockAppAbility);

      expect(() =>
        activityService.checkPermission(mockUser, 'appId')
      ).not.toThrow();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const timeZone = 'UTC';

      const result = (activityService as any).formatDate(date, timeZone);

      expect(result).toBe('2023-01-01 12:00');
    });
  });
});
