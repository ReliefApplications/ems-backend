import { accessibleBy } from '@casl/mongoose';
import { Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { RouteDefinition } from 'types/route-definition';
import ApiError from '../../abstractions/api-error';
import BaseController from '../../abstractions/base.controller';

/** Form of a resource, reduced to its ordered field names. */
export interface ResourceFormFields {
  id: string;
  name: string;
  fields: string[];
}

/** Stored form field shape needed by this controller. */
interface StoredFormField {
  name?: string;
}

/**
 * Resource controller
 */
export default class ResourceController extends BaseController {
  /** Controller base path */
  public basePath = 'resources';

  /** @returns List of routes & handlers */
  public routes(): RouteDefinition[] {
    return [
      {
        path: '/:id/forms',
        method: 'get',
        handler: this.listForms.bind(this),
      },
    ];
  }

  /**
   * List readable forms of a resource with their field names, in form-definition order.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  public async listForms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(ReasonPhrases.NOT_FOUND, StatusCodes.NOT_FOUND);
      }

      const ability: AppAbility = req.context.user.ability;
      const forms = await Form.find({
        resource: id,
        ...accessibleBy(ability, 'read').Form,
      }).select('name fields.name');

      const data: ResourceFormFields[] = forms.map((form) => ({
        id: form.id,
        name: form.name ?? '',
        fields: (form.fields ?? [])
          .map((field: StoredFormField) => field.name)
          .filter((name): name is string => !!name),
      }));

      res.locals.data = data;
      this.send(res);
    } catch (err) {
      next(err);
    }
  }
}
