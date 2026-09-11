import { createMongoAbility } from '@casl/ability';
import { Form } from '@models';
import ResourceController from '@routes/resource/resource.controller';
import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../../src/abstractions/api-error';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

describe('Resource Controller', () => {
  let databaseHelpers: DatabaseHelpers;
  let controller: ResourceController;
  let request: Partial<Request>;
  let response: Partial<Response>;
  let next: NextFunction;
  let resourceId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    controller = new ResourceController();
    resourceId = new mongoose.Types.ObjectId();

    await Form.create([
      {
        name: 'First form',
        graphQLTypeName: 'FirstResourceForm',
        resource: resourceId,
        fields: [{ name: 'second' }, { name: 'first' }],
      },
      {
        name: 'Other resource form',
        graphQLTypeName: 'OtherResourceForm',
        resource: new mongoose.Types.ObjectId(),
        fields: [{ name: 'other' }],
      },
    ]);
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    next = jest.fn();
    request = {
      params: {},
      context: {
        user: {
          ability: createMongoAbility([{ action: 'read', subject: 'Form' }]),
        },
      },
    } as unknown as Partial<Request>;
    response = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as Partial<Response>;
  });

  it('should define routes', () => {
    expect(controller.routes()).toEqual([
      expect.objectContaining({ path: '/:id/forms', method: 'get' }),
    ]);
  });

  describe('List forms', () => {
    it('returns forms and field names in their definition order', async () => {
      request.params = { id: resourceId.toString() };

      await controller.listForms(
        request as Request,
        response as Response,
        next
      );

      expect(next).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(response.locals?.data).toHaveLength(1);
      expect(response.locals?.data[0]).toMatchObject({
        name: 'First form',
        fields: ['second', 'first'],
      });
    });

    it('returns 404 for an invalid resource id', async () => {
      request.params = { id: 'not-an-object-id' };

      await controller.listForms(
        request as Request,
        response as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(
        new ApiError(ReasonPhrases.NOT_FOUND, StatusCodes.NOT_FOUND)
      );
      expect(response.send).not.toHaveBeenCalled();
    });
  });
});
