import { NextFunction, Request, Response } from 'express';
import { RouteDefinition } from 'types/route-definition';
import BaseController from '../../abstractions/base.controller';
import { StyleService } from './style.service';
import fs from 'fs';

/**
 * Style controller, extends base controller
 */
export default class StyleController extends BaseController {
  /** Controller base path */
  public basePath = 'style';

  /** Style service */
  private style: StyleService;

  /**
   * Style controller, extends base controller
   */
  constructor() {
    super();
    this.style = new StyleService();
  }

  /** @returns List of routes & handlers */
  public routes(): RouteDefinition[] {
    return [
      {
        path: '/application/:id',
        method: 'get',
        handler: this.getApplicationStyle.bind(this),
      },
      {
        path: '/scss-to-css',
        method: 'post',
        handler: this.convertScssToCss.bind(this),
      },
    ];
  }

  /**
   * Get application custom style, as scss
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async getApplicationStyle(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.context.user;
      const applicationId = req.params.id;
      const path = await this.style.getApplicationStyle(user, applicationId);
      res.download(path, () => {
        fs.unlink(path, () => undefined);
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Convert scss content to css content
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async convertScssToCss(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const scss = req.body.scss;
      res.locals.data = this.style.convertScssToCss(scss);
      this.send(res);
    } catch (err) {
      next(err);
    }
  }
}
