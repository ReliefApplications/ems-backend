import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import ApiError from '../../abstractions/api-error';
import BaseController from '../../abstractions/base.controller';
import { RouteDefinition } from 'types/route-definition';
import { TranslationService } from '../../services/translation.service';

/**
 * Translation controller.
 */
export default class TranslationController extends BaseController {
  /** Controller base path */
  public basePath = 'translate';

  /** Translation service instance */
  private translationService = new TranslationService();

  /** @returns List of routes & handlers */
  public routes(): RouteDefinition[] {
    return [
      {
        path: '/',
        method: 'post',
        handler: this.translate.bind(this),
      },
    ];
  }

  /**
   * Translate text using Azure Cognitive Translator.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async translate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { text, from, to, format } = req.body;
      if (!text || !to) {
        throw new ApiError(ReasonPhrases.BAD_REQUEST, StatusCodes.BAD_REQUEST);
      }
      const translation = await this.translationService.translate(
        text,
        from || null,
        to,
        format
      );
      res.locals.data = { translation };
      this.send(res);
    } catch (err) {
      next(err);
    }
  }
}
