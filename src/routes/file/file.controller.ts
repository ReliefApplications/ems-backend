import { NextFunction, Request, Response } from 'express';
import { RouteDefinition } from 'types/route-definition';
import BaseController from '../../abstractions/base.controller';
import { Record, Resource } from '@models';
import { Types } from 'mongoose';

/**
 * File controller
 */
export default class FileController extends BaseController {
  public basePath = 'file';

  /** @returns List of available routes */
  public routes(): RouteDefinition[] {
    return [
      {
        path: '/drive/:driveId/item/:itemId/associated-record',
        method: 'get',
        handler: this.findAssociatedRecordId.bind(this),
      },
    ];
  }

  /**
   * Find the associated record ID for a given drive and item.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   * @returns Promise<void> - Sends the associated record ID in the response or an error if not found.
   */
  public async findAssociatedRecordId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { driveId, itemId } = req.params;
      const { resourceId } = req.query;
      if (!resourceId && typeof resourceId !== 'string') {
        res.status(400).send({ error: 'Resource ID is required' });
        return;
      }
      if (!itemId) {
        res.status(400).send({ error: 'Item ID is required' });
        return;
      }

      const [resource] = await Resource.aggregate([
        { $match: { _id: new Types.ObjectId(String(resourceId)) } },
        {
          $project: {
            fileFields: {
              $filter: {
                input: '$fields',
                cond: { $eq: ['$$this.type', 'file'] },
              },
            },
          },
        },
      ]);

      if (!resource) {
        res.status(404).send({ error: 'Resource not found' });
        return;
      }

      // Now use the file fields to build the query for Record
      const fileFieldQueries = resource.fileFields.map((field) => ({
        [`data.${field.name}`]: {
          $elemMatch: {
            'content.itemId': { $regex: new RegExp(`^${itemId}$`, 'i') },
            'content.driveId': { $regex: new RegExp(`^${driveId}$`, 'i') },
          },
        },
      }));

      const associatedRecord = await Record.findOne({
        resource: new Types.ObjectId(String(resourceId)),
        archived: { $ne: true },
        $or: fileFieldQueries,
      }).select('_id');

      if (!associatedRecord) {
        res.status(404).send({ error: 'Record not found' });
        return;
      }

      res.locals.data = associatedRecord._id;
      this.send(res);
    } catch (err) {
      next(err);
    }
  }
}
