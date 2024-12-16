import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Route definition interface.
 */
export interface RouteDefinition {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  handler: (req: Request, res: Response, next: NextFunction) => void;
  middlewares?: RequestHandler[];
}
