// import { AuthenticationError } from 'apollo-server-express';
// import { AuthenticationError } from '@apollo/server';
import i18next from 'i18next';
import { graphqlMiddleware } from '../middlewares';
import { GraphQLError } from 'graphql';

/**
 * Gets the middleware function promise
 *
 * @param connectionParams the connection params
 * @param ws the websocket
 * @returns middleware function promise
 */
export default (connectionParams, ws: any) => {
  if (connectionParams.authToken) {
    console.log(
      'connectionParams.authToken ========>>',
      connectionParams.authToken
    );
    // ws.upgradeReq.headers.authorization = `Bearer ${connectionParams.authToken}`;
    ws.upgradeReq.headers.authorization = connectionParams.authToken;
    console.log('ws.upgradeReq.headers.authorization', JSON.stringify(ws));
    return new Promise((res) => {
      graphqlMiddleware(ws.upgradeReq, {} as any, () => {
        res(ws.upgradeReq);
      });
    });
  } else {
    console.log('==============ERROR==============');
    throw new GraphQLError(
      i18next.t('common.errors.authenticationTokenNotFound')
    );
  }
};
