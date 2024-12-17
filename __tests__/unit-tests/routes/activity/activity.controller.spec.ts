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

  // === Get routes ==
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
});
