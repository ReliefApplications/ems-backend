import { AuthenticationError } from 'apollo-server-express';
import i18next from 'i18next';
import { graphqlMiddleware } from '../middlewares';

export default (connectionParams, ws: any) => {
  if (connectionParams.authToken) {
    ws.upgradeReq.headers.authorization = `Bearer ${connectionParams.authToken}`;
    return new Promise((res) => {
      graphqlMiddleware(ws.upgradeReq, {} as any, () => {
        res(ws.upgradeReq);
      });
    });
  } else {
    throw new AuthenticationError(i18next.t('errors.authenticationTokenNotFound'));
  }
};
