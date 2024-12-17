import { ActivityLog } from '@models';
import {
  ActivityCreationAttributes,
  ActivityService,
} from '@routes/activity/activity.service';
import { logger } from '@services/logger.service';
import ApiError from '../../../../src/abstractions/api-error';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import * as XLSBuilder from '@utils/files/xlsBuilder';

jest.mock('@services/logger.service');
jest.mock('@utils/files/xlsBuilder');

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

  describe('List activities', () => {
    it('should execute aggregation and return data', async () => {
      const query = {};
      const aggregationResult = {
        items: [],
        totalCount: 10,
      };
      const listAggregationMock = jest.spyOn(service as any, 'listAggregation');
      listAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnValue([aggregationResult]), // need to mock like that to prevent error to be raised when running code
      });

      const result = await service.list(query);
      expect(listAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        items: aggregationResult.items,
        skip: 0,
        take: 10,
        total: aggregationResult.totalCount,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Database error');

      const listAggregationMock = jest.spyOn(service as any, 'listAggregation');
      listAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValueOnce(error), // need to mock like that to prevent error to be raised when running code
      });

      await expect(service.list(query)).rejects.toThrow(error);
      expect(listAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Group By Url', () => {
    it('should execute aggregation and return data', async () => {
      const query = {};
      const aggregationResult = {
        items: [],
        totalCount: 10,
      };
      const groupByUrlAggregationMock = jest.spyOn(
        service as any,
        'groupByUrlAggregation'
      );
      groupByUrlAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnValue([aggregationResult]), // need to mock like that to prevent error to be raised when running code
      });

      const result = await service.groupByUrl(query);
      expect(groupByUrlAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        items: aggregationResult.items,
        skip: 0,
        take: 10,
        total: aggregationResult.totalCount,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Database error');

      const groupByUrlAggregationMock = jest.spyOn(
        service as any,
        'groupByUrlAggregation'
      );
      groupByUrlAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValueOnce(error), // need to mock like that to prevent error to be raised when running code
      });

      await expect(service.groupByUrl(query)).rejects.toThrow(error);
      expect(groupByUrlAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Group By User', () => {
    it('should execute aggregation and return data', async () => {
      const query = {};
      const aggregationResult = {
        items: [],
        totalCount: 10,
      };
      const groupByUserAggregationMock = jest.spyOn(
        service as any,
        'groupByUserAggregation'
      );
      groupByUserAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnValue([aggregationResult]), // need to mock like that to prevent error to be raised when running code
      });

      const result = await service.groupByUser(query);
      expect(groupByUserAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        items: aggregationResult.items,
        skip: 0,
        take: 10,
        total: aggregationResult.totalCount,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Database error');

      const groupByUserAggregationMock = jest.spyOn(
        service as any,
        'groupByUserAggregation'
      );
      groupByUserAggregationMock.mockReturnValueOnce({
        facet: jest.fn().mockReturnThis(),
        project: jest.fn().mockRejectedValueOnce(error), // need to mock like that to prevent error to be raised when running code
      });

      await expect(service.groupByUser(query)).rejects.toThrow(error);
      expect(groupByUserAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Download List', () => {
    it('should execute aggregation and return file', async () => {
      const query = {};
      const aggregationResult = [];
      const listAggregationMock = jest.spyOn(service as any, 'listAggregation');
      listAggregationMock.mockResolvedValueOnce(aggregationResult);

      const mockFile = Buffer.from('Test content');
      jest.spyOn(XLSBuilder, 'default').mockResolvedValueOnce(mockFile as any);

      const result = await service.downloadList(query);
      expect(listAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        fileName: (service as any).listExportFileName,
        file: mockFile,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Some error occurred');

      const listAggregationMock = jest
        .spyOn(service as any, 'listAggregation')
        .mockRejectedValueOnce(error);

      await expect(service.downloadList(query)).rejects.toThrow(error);
      expect(listAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Download Group By Url', () => {
    it('should execute aggregation and return file', async () => {
      const query = {};
      const aggregationResult = [];
      const groupByUrlAggregationMock = jest.spyOn(
        service as any,
        'groupByUrlAggregation'
      );
      groupByUrlAggregationMock.mockResolvedValueOnce(aggregationResult);

      const mockFile = Buffer.from('Test content');
      jest.spyOn(XLSBuilder, 'default').mockResolvedValueOnce(mockFile as any);

      const result = await service.downloadGroupByUrl(query);
      expect(groupByUrlAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        fileName: (service as any).groupByUrlExportFileName,
        file: mockFile,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Some error occurred');

      const groupByUrlAggregationMock = jest
        .spyOn(service as any, 'groupByUrlAggregation')
        .mockRejectedValueOnce(error);

      await expect(service.downloadGroupByUrl(query)).rejects.toThrow(error);
      expect(groupByUrlAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Download Group By User', () => {
    it('should execute aggregation and return file', async () => {
      const query = {};
      const aggregationResult = [];
      const groupByUserAggregationMock = jest.spyOn(
        service as any,
        'groupByUserAggregation'
      );
      groupByUserAggregationMock.mockResolvedValueOnce(aggregationResult);

      const mockFile = Buffer.from('Test content');
      jest.spyOn(XLSBuilder, 'default').mockResolvedValueOnce(mockFile as any);

      const result = await service.downloadGroupByUser(query);
      expect(groupByUserAggregationMock).toHaveBeenCalled();
      expect(result).toEqual({
        fileName: (service as any).groupByUserExportFileName,
        file: mockFile,
      });
    });

    it('should handle & log errors', async () => {
      const query = {};
      const error = new Error('Some error occurred');

      const groupByUserAggregationMock = jest
        .spyOn(service as any, 'groupByUserAggregation')
        .mockRejectedValueOnce(error);

      await expect(service.downloadGroupByUser(query)).rejects.toThrow(error);
      expect(groupByUserAggregationMock).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Check Permission', () => {
    let mockUser: any;
    beforeEach(() => {
      mockUser = {
        ability: {
          cannot: jest.fn(),
          can: jest.fn(),
        },
      };
    });

    it('should throw an ApiError if the user cannot manage "User" & no application', async () => {
      mockUser.ability.cannot.mockReturnValue(true);
      expect(() => {
        service.checkPermission(mockUser, 'app123');
      }).toThrowError(
        new ApiError('Permission not granted', StatusCodes.FORBIDDEN)
      );
      expect(mockUser.ability.cannot).toHaveBeenCalledWith('manage', 'User');
    });

    it('should not throw an error if the user can manage "User"', async () => {
      mockUser.ability.cannot.mockReturnValue(false);
      service.checkPermission(mockUser, 'app123');
      expect(mockUser.ability.cannot).toHaveBeenCalledWith('manage', 'User');
    });
  });

  describe('Format Data', () => {
    const mockDate = new Date(Date.UTC(2024, 11, 17, 14, 30));
    const timeZone = 'UTC';
    let formatDateMethod: any;

    beforeEach(() => {
      // Accessing a private method
      formatDateMethod = (service as any).formatDate;
    });

    it('should format the date correctly in the expected format', () => {
      const expectedDate = '2024-12-17 14:30';
      const result = formatDateMethod(mockDate, timeZone);
      expect(result).toBe(expectedDate);
    });
  });

  describe('List Aggregation', () => {
    let listAggregationMethod: any;
    const mockResult = {
      _id: '1',
      userId: 'user1',
      username: 'user1',
      metadata: { title: 'Test Title', url: 'test-url' },
      attributes: {},
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Accessing a private method
      listAggregationMethod = (service as any).listAggregation;
    });

    it('should call groupByUrlAggregation with correct parameters', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [{ username: 'user1' }];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([mockResult]);

      const result = await listAggregationMethod(sortField, sortOrder, filters);
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $match: {
            $and: filters,
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            username: 1,
            metadata: {
              $mergeObjects: [
                '$metadata',
                {
                  title: { $ifNull: ['$metadata.title', '$metadata.url'] },
                },
              ],
            },
            attributes: 1,
            createdAt: 1,
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([mockResult]);
    });

    it('should skip filters if empty', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([mockResult]);

      const result = await listAggregationMethod(sortField, sortOrder, filters);
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $project: {
            _id: 1,
            userId: 1,
            username: 1,
            metadata: {
              $mergeObjects: [
                '$metadata',
                {
                  title: { $ifNull: ['$metadata.title', '$metadata.url'] },
                },
              ],
            },
            attributes: 1,
            createdAt: 1,
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([mockResult]);
    });
  });

  describe('Group By Url Aggregation', () => {
    let groupByUrlAggregationMethod: any;

    beforeEach(() => {
      // Accessing a private method
      groupByUrlAggregationMethod = (service as any).groupByUrlAggregation;
    });

    it('should call groupByUrlAggregation with correct parameters', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [{ username: 'user1' }];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([
        { 'metadata.title': 'page1', count: 5 },
      ]);

      const result = await groupByUrlAggregationMethod(
        sortField,
        sortOrder,
        filters
      );
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $match: {
            $and: filters,
          },
        },
        {
          $group: {
            _id: '$metadata.url',
            count: { $sum: 1 },
            title: { $last: '$metadata.title' },
          },
        },
        {
          $project: {
            count: 1,
            _id: 0,
            'metadata.title': {
              $ifNull: ['$title', '$_id'],
            },
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([{ 'metadata.title': 'page1', count: 5 }]);
    });

    it('should skip filters if empty', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([
        { 'metadata.title': 'page1', count: 5 },
      ]);

      const result = await groupByUrlAggregationMethod(
        sortField,
        sortOrder,
        filters
      );
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $group: {
            _id: '$metadata.url',
            count: { $sum: 1 },
            title: { $last: '$metadata.title' },
          },
        },
        {
          $project: {
            count: 1,
            _id: 0,
            'metadata.title': {
              $ifNull: ['$title', '$_id'],
            },
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([{ 'metadata.title': 'page1', count: 5 }]);
    });
  });

  describe('Group By User Aggregation', () => {
    let groupByUserAggregationMethod: any;

    beforeEach(() => {
      // Accessing a private method
      groupByUserAggregationMethod = (service as any).groupByUserAggregation;
    });

    it('should call groupByUserAggregation with correct parameters', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [{ username: 'user1' }];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([
        { username: 'user1', count: 5, attributes: {} },
      ]);

      const result = await groupByUserAggregationMethod(
        sortField,
        sortOrder,
        filters
      );
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $match: {
            $and: filters,
          },
        },
        {
          $group: {
            _id: {
              username: '$username',
              attributes: {
                $cond: [{ $not: ['$username'] }, '$attributes', null],
              },
            },
            count: { $sum: 1 },
            attributes: { $last: '$attributes' },
          },
        },
        {
          $project: {
            username: '$_id.username',
            count: 1,
            attributes: 1,
            _id: 0,
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([{ username: 'user1', count: 5, attributes: {} }]);
    });

    it('should skip filters if empty', async () => {
      const sortField = 'count';
      const sortOrder = 'asc';
      const filters = [];

      const aggregateMock = jest.spyOn(ActivityLog, 'aggregate');
      aggregateMock.mockResolvedValue([
        { username: 'user1', count: 5, attributes: {} },
      ]);

      const result = await groupByUserAggregationMethod(
        sortField,
        sortOrder,
        filters
      );
      expect(aggregateMock).toHaveBeenCalledWith([
        {
          $group: {
            _id: {
              username: '$username',
              attributes: {
                $cond: [{ $not: ['$username'] }, '$attributes', null],
              },
            },
            count: { $sum: 1 },
            attributes: { $last: '$attributes' },
          },
        },
        {
          $project: {
            username: '$_id.username',
            count: 1,
            attributes: 1,
            _id: 0,
          },
        },
        {
          $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
        },
      ]);
      expect(result).toEqual([{ username: 'user1', count: 5, attributes: {} }]);
    });
  });
});
