import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { ActivityService } from './activity.service';
import ApiError from 'abstractions/api-error';
import BaseController from 'abstractions/base.controller';
import { RouteDefinition } from 'types/route-definition';
import { isNil } from 'lodash';

/**
 * Activity controller.
 */
export default class ActivityController extends BaseController {
  /** Controller base path */
  public basePath = 'activities';

  /** Activity service */
  private activity: ActivityService;

  /**
   * Activity controller.
   */
  constructor() {
    super();
    this.activity = new ActivityService();
  }

  /** @returns List of routes & handlers */
  public routes(): RouteDefinition[] {
    return [
      {
        path: '/',
        method: 'post',
        handler: this.createActivity.bind(this),
      },
      {
        path: '/',
        method: 'get',
        handler: this.getActivities.bind(this),
      },
      {
        path: '/group-by-url',
        method: 'get',
        handler: this.groupByUrl.bind(this),
      },
      {
        path: '/group-by-user',
        method: 'get',
        handler: this.groupByUser.bind(this),
      },
      {
        path: '/download',
        method: 'post',
        handler: this.downloadList.bind(this),
      },
    ];
  }

  /**
   * Create a new activity
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async createActivity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.context.user;
      const { eventType, metadata } = req.body;
      if (!eventType) {
        throw new ApiError(ReasonPhrases.BAD_REQUEST, StatusCodes.BAD_REQUEST);
      }
      const activity = await this.activity.create({
        user,
        eventType,
        metadata,
      });
      res.locals.data = activity;
      this.send(res, StatusCodes.CREATED);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get list of activities
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async getActivities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        skip,
        take,
        sortField,
        sortOrder,
        filter,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        application_id,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        user_id,
      } = req.query;
      const aggregation = await this.activity.list({
        ...(application_id && { applicationId: application_id as string }),
        ...(user_id && { userId: user_id as string }),
        ...(!isNil(skip) && { skip: Number(skip) }),
        ...(!isNil(take) && { take: Number(take) }),
        sortField: sortField as string,
        sortOrder: sortOrder as string,
        ...(filter && { filter: JSON.parse(filter as string) }),
      });
      res.locals.data = {
        data: aggregation.items,
        skip: aggregation.skip,
        take: aggregation.take,
        total: aggregation.total,
      };
      this.send(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Group activities by url
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async groupByUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        skip,
        take,
        sortField,
        sortOrder,
        filter,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        application_id,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        user_id,
      } = req.query;
      const aggregation = await this.activity.groupByUrl({
        ...(application_id && { applicationId: application_id as string }),
        ...(user_id && { userId: user_id as string }),
        ...(!isNil(skip) && { skip: Number(skip) }),
        ...(!isNil(take) && { take: Number(take) }),
        sortField: sortField as string,
        sortOrder: sortOrder as string,
        ...(filter && { filter: JSON.parse(filter as string) }),
      });
      res.locals.data = {
        data: aggregation.items,
        skip: aggregation.skip,
        take: aggregation.take,
        total: aggregation.total,
      };
      this.send(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get group activities by user
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async groupByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        skip,
        take,
        sortField,
        sortOrder,
        filter,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        application_id,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        user_id,
      } = req.query;
      const aggregation = await this.activity.groupByUser({
        ...(application_id && { applicationId: application_id as string }),
        ...(user_id && { userId: user_id as string }),
        ...(!isNil(skip) && { skip: Number(skip) }),
        ...(!isNil(take) && { take: Number(take) }),
        sortField: sortField as string,
        sortOrder: sortOrder as string,
        ...(filter && { filter: JSON.parse(filter as string) }),
      });
      res.locals.data = {
        data: aggregation.items,
        skip: aggregation.skip,
        take: aggregation.take,
        total: aggregation.total,
      };
      this.send(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Download list of activities
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async downloadList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        timeZone,
        sortField,
        sortOrder,
        filter,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        applicationId,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        userId,
      } = req.body;
      const { fileName, file } = await this.activity.downloadList({
        ...(timeZone && { timeZone: timeZone as string }),
        ...(applicationId && { applicationId: applicationId as string }),
        ...(userId && { userId: userId as string }),
        sortField: sortField as string,
        sortOrder: sortOrder as string,
        ...(filter && { filter }),
      });
      res.locals.data = file;
      res.attachment(fileName);
      this.send(res);
    } catch (err) {
      next(err);
    }
  }
}
