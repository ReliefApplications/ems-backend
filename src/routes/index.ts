import { Router } from 'express';
import { restMiddleware, rateLimitMiddleware } from '../server/middlewares';
import download from './download';
import proxy from './proxy';
import upload from './upload';
import email from './email';
import summarycards from './summarycards';
import fileUpload from 'express-fileupload';
import permissions from './permissions';
import roles from './roles';
import gis from './gis';
import notification from './notification';
import config from 'config';
import { RouteDefinition } from 'types/route-definition';
import { logger } from '@services/logger.service';
import ActivityController from './activity/activity.controller';
import StyleController from './style/style.controller';
import errorHandlerMiddleware from '@server/middlewares/error-handler';

/**
 *
 * The registerControllerRoutes function creates an Express Router instance and
 * maps route definitions to corresponding HTTP methods
 * such as GET, POST, PUT, PATCH, and DELETE, with their respective handlers.
 * It then returns the configured router.
 *
 * @param routes List of routes
 * @returns Router
 */
function registerControllerRoutes(routes: RouteDefinition[]): Router {
  const controllerRouter = Router();
  routes.forEach((route) => {
    const handlers = route.middlewares
      ? [...route.middlewares, route.handler]
      : [route.handler];
    switch (route.method) {
      case 'get':
        controllerRouter.get(route.path, ...handlers);
        break;
      case 'post':
        controllerRouter.post(route.path, ...handlers);
        break;
      case 'put':
        controllerRouter.put(route.path, ...handlers);
        break;
      case 'patch':
        controllerRouter.put(route.path, ...handlers);
        break;
      case 'delete':
        controllerRouter.delete(route.path, ...handlers);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${route.method}`);
    }
  });
  // todo: move somewhere else
  controllerRouter.use(errorHandlerMiddleware);
  return controllerRouter;
}

/**
 * Register routes
 *
 * @returns Router
 */
export default function registerRoutes(): Router | undefined {
  try {
    const router = Router();

    // Todo: update all routes to use new controller
    router.use(fileUpload());
    if (config.get('server.rateLimit.enable')) {
      router.use(rateLimitMiddleware);
    }
    router.use(restMiddleware);
    router.use('/download', download);
    router.use('/proxy', proxy);
    router.use('/upload', upload);
    router.use('/email', email);
    router.use('/permissions', permissions);
    router.use('/summarycards', summarycards);
    router.use('/roles', roles);
    router.use('/gis', gis);
    router.use('/notification', notification);

    // Define an array of controller objects
    const controllers = [new ActivityController(), new StyleController()];

    // Dynamically register routes for each controller
    controllers.forEach((controller) => {
      // make sure each controller has basePath attribute and routes() method
      router.use(
        `/${controller.basePath}`,
        registerControllerRoutes(controller.routes())
      );
    });

    return router;
  } catch (error) {
    logger.error('Unable to register the routes:', error);
  }
}
