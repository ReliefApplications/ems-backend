import 'jest';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import errorHandlerMiddleware from '@server/middlewares/error-handler';

describe('ErrorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn(),
      send: jest.fn(),
    };
  });

  test('with 0 status code', async () => {
    const status: number = StatusCodes.INTERNAL_SERVER_ERROR;
    errorHandlerMiddleware(
      {
        status: 0,
        success: false,
        fields: {
          name: {
            message: '',
          },
        },
        name: '',
        message: '',
      },
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(status);
  });

  test('with 200 status code', async () => {
    const status = 200;
    errorHandlerMiddleware(
      {
        status,
        success: false,
        fields: {
          name: {
            message: '',
          },
        },
        name: '',
        message: '',
      },
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(status);
  });

  test('addErrorHandler with 200 status code', async () => {
    const status = 200;
    errorHandlerMiddleware(
      {
        status,
        success: false,
        fields: {
          name: {
            message: '',
          },
        },
        name: '',
        message: '',
      },
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(status);
  });

  test('with 200 status code and updated env variables', async () => {
    process.env.APPLY_ENCRYPTION = 'true';
    process.env.SECRET_KEY = 'key';
    const status = 200;
    errorHandlerMiddleware(
      {
        status,
        success: false,
        fields: {
          name: {
            message: '',
          },
        },
        name: '',
        message: '',
      },
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(status);
  });
});
