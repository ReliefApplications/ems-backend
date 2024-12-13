import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { ActivityService } from './activity.service';
import ApiError from 'abstractions/api-error';
import BaseController from 'abstractions/base.controller';
import { RouteDefinition } from 'types/route-definition';

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

  public routes(): RouteDefinition[] {
    return [
      {
        path: '/',
        method: 'post',
        handler: this.createActivity.bind(this),
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
}
