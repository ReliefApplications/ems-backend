import ActivityController from '@routes/activity/activity.controller';
import { NextFunction, Request, Response } from 'express';
import { RouteDefinition } from '../../../../src/types/route-definition';
import {
  ActivityCreationAttributes,
  ActivityService,
} from '@routes/activity/activity.service';
import { Types } from 'mongoose';
import { ActivityLog } from '@models';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import ApiError from '../../../../src/abstractions/api-error';

describe('Activity Controller', () => {
  let request: Partial<Request>;
  let response: Partial<Response>;
  const next: NextFunction = jest.fn();
  let controller: ActivityController;

  const user = {
    _id: '676149c37eb17e606b71c889',
    username: 'mock user',
    attributes: {},
  };

  const creationData: ActivityCreationAttributes = {
    user,
    eventType: 'navigation',
    metadata: {
      url: '/mock-url',
    },
  };

  beforeAll(async () => {
    controller = new ActivityController();
  });

  beforeEach(() => {
    request = {} as Partial<Request>;
    response = {
      locals: {},
      status: jest.fn(),
      send: jest.fn(),
    } as Partial<Response>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should define routes and return array of route definition', () => {
    const routes: RouteDefinition[] = controller.routes();
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });

  describe('Create Activity', () => {
    it('should create an activity', async () => {
      const createdActivity = new ActivityLog({
        userId: new Types.ObjectId(creationData.user._id),
        username: creationData.user.username,
        eventType: creationData.eventType,
        metadata: creationData.metadata,
      });

      const createMock = jest.spyOn(ActivityService.prototype, 'create');
      createMock.mockResolvedValueOnce(createdActivity);

      request.body = {
        eventType: creationData.eventType,
        metadata: creationData.metadata,
      };
      request.context = { user };

      await controller.createActivity(
        request as Request,
        response as Response,
        next
      );
      expect(createMock).toHaveBeenCalledWith(creationData);
      const locals = response.locals;
      expect(locals?.data).toEqual(createdActivity);
      expect(response.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('should throw an error if no event type provided', async () => {
      request.body = {};
      request.context = { user };

      await controller.createActivity(
        request as Request,
        response as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(
        new ApiError(ReasonPhrases.BAD_REQUEST, StatusCodes.BAD_REQUEST)
      );
    });

    it('should handle errors in create activity', async () => {
      request.body = {
        eventType: creationData.eventType,
        metadata: creationData.metadata,
      };
      request.context = { user };

      const error = new Error('Database error');
      const createMock = jest.spyOn(ActivityService.prototype, 'create');
      createMock.mockRejectedValueOnce(error);

      await controller.createActivity(
        request as Request,
        response as Response,
        next
      );

      expect(createMock).toHaveBeenCalledWith(creationData);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Get activities', () => {
    it('should return aggregation by user data', async () => {
      request.context = { user };
      request.query = {};

      const listMock = jest.spyOn(ActivityService.prototype, 'list');
      listMock.mockResolvedValueOnce({
        items: [],
        skip: 0,
        take: 10,
        total: 5,
      });
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.getActivities(
        request as Request,
        response as Response,
        next
      );

      expect(listMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual({
        data: [],
        skip: 0,
        take: 10,
        total: 5,
      });
    });

    it('should handle errors in list activities', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Database error');
      const listMock = jest.spyOn(ActivityService.prototype, 'list');
      listMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.getActivities(
        request as Request,
        response as Response,
        next
      );

      expect(listMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.getActivities(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Group By Url', () => {
    it('should return aggregation by user data', async () => {
      request.context = { user };
      request.query = {};

      const groupByUrlMock = jest.spyOn(
        ActivityService.prototype,
        'groupByUrl'
      );
      groupByUrlMock.mockResolvedValueOnce({
        items: [],
        skip: 0,
        take: 10,
        total: 5,
      });
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.groupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(groupByUrlMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual({
        data: [],
        skip: 0,
        take: 10,
        total: 5,
      });
    });

    it('should handle errors in groupByUrl activities', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Database error');
      const groupByUrlMock = jest.spyOn(
        ActivityService.prototype,
        'groupByUrl'
      );
      groupByUrlMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.groupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(groupByUrlMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.groupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Group By User', () => {
    it('should return aggregation by user data', async () => {
      request.context = { user };
      request.query = {};

      const groupByUserMock = jest.spyOn(
        ActivityService.prototype,
        'groupByUser'
      );
      groupByUserMock.mockResolvedValueOnce({
        items: [],
        skip: 0,
        take: 10,
        total: 5,
      });
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.groupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(groupByUserMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual({
        data: [],
        skip: 0,
        take: 10,
        total: 5,
      });
    });

    it('should handle errors in groupByUser activities', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Database error');
      const groupByUserMock = jest.spyOn(
        ActivityService.prototype,
        'groupByUser'
      );
      groupByUserMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.groupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(groupByUserMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.query = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.groupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Download list', () => {
    it('should attach file to response', async () => {
      request.context = { user };
      request.body = {};
      const data = { fileName: 'test.xlsx', file: Buffer.from('file content') };

      const downloadListMock = jest.spyOn(
        ActivityService.prototype,
        'downloadList'
      );
      downloadListMock.mockResolvedValueOnce(data as any);
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadList(
        request as Request,
        response as Response,
        next
      );

      expect(downloadListMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual(data.file);
    });

    it('should handle errors in downloadList activities', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Database error');
      const downloadListMock = jest.spyOn(
        ActivityService.prototype,
        'downloadList'
      );
      downloadListMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadList(
        request as Request,
        response as Response,
        next
      );

      expect(downloadListMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.downloadList(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Download group by url', () => {
    it('should attach file to response', async () => {
      request.context = { user };
      request.body = {};
      const data = { fileName: 'test.xlsx', file: Buffer.from('file content') };

      const downloadGroupByUrlMock = jest.spyOn(
        ActivityService.prototype,
        'downloadGroupByUrl'
      );
      downloadGroupByUrlMock.mockResolvedValueOnce(data as any);
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadGroupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(downloadGroupByUrlMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual(data.file);
    });

    it('should handle errors in downloadGroupByUrl activities', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Database error');
      const downloadGroupByUrlMock = jest.spyOn(
        ActivityService.prototype,
        'downloadGroupByUrl'
      );
      downloadGroupByUrlMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadGroupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(downloadGroupByUrlMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.downloadGroupByUrl(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Download group by user', () => {
    it('should attach file to response', async () => {
      request.context = { user };
      request.body = {};
      const data = { fileName: 'test.xlsx', file: Buffer.from('file content') };

      const downloadGroupByUserMock = jest.spyOn(
        ActivityService.prototype,
        'downloadGroupByUser'
      );
      downloadGroupByUserMock.mockResolvedValueOnce(data as any);
      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadGroupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(downloadGroupByUserMock).toHaveBeenCalledWith({});
      expect(response.locals.data).toEqual(data.file);
    });

    it('should handle errors in downloadGroupByUser activities', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Database error');
      const downloadGroupByUserMock = jest.spyOn(
        ActivityService.prototype,
        'downloadGroupByUser'
      );
      downloadGroupByUserMock.mockRejectedValueOnce(error);

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockReturnValueOnce();

      await controller.downloadGroupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(downloadGroupByUserMock).toHaveBeenCalledWith({});
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors in check permission', async () => {
      request.context = { user };
      request.body = {};

      const error = new Error('Permission error');

      const checkPermissionMock = jest.spyOn(
        ActivityService.prototype,
        'checkPermission'
      );
      checkPermissionMock.mockImplementationOnce(() => {
        throw error;
      });

      await controller.downloadGroupByUser(
        request as Request,
        response as Response,
        next
      );

      expect(checkPermissionMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
