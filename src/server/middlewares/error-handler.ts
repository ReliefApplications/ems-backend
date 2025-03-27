import * as util from 'util';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../abstractions/api-error';
import { logger } from '@services/logger.service';

/**
 * Error handler middleware
 *
 * @param err Api error
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
const errorHandlerMiddleware = (
  err: ApiError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  if (err) {
    const status: number = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
    logger.error(`REQUEST HANDLING ERROR:
        \nERROR:\n${JSON.stringify(err)}
        \nREQUEST HEADERS:\n${util.inspect(req.headers)}
        \nREQUEST PARAMS:\n${util.inspect(req.params)}
        \nREQUEST QUERY:\n${util.inspect(req.query)}
        \nBODY:\n${util.inspect(req.body)}`);
    const body: Error | string = {
      // fields: err.fields,
      message: err.message || 'An error occurred during the request.',
      name: err.name,
      // status,
    };
    res.status(status);
    res.send(body);
  }
  next();
};

export default errorHandlerMiddleware;
