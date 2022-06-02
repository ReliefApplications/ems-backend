import { AuthenticationError } from 'apollo-server-express';
import errors from '../../const/errors';
import { graphqlMiddleware } from '../middlewares';

/**
 * Gets the middleware function promise
 *
 * @param connectionParams the connection params
 * @param ws the websocket
 * @returns middleware function promise
 */
export default (connectionParams, ws: any) => {
  if (connectionParams.authToken) {
    ws.upgradeReq.headers.authorization = `Bearer ${connectionParams.authToken}`;
    return new Promise((res) => {
      graphqlMiddleware(ws.upgradeReq, {} as any, () => {
        res(ws.upgradeReq);
      });
    });
  } else {
    throw new AuthenticationError(errors.authenticationTokenNotFound);
  }
};
