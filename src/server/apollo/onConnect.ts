// import { AuthenticationError } from 'apollo-server-express';
// import { AuthenticationError } from '@apollo/server';
// import i18next from 'i18next';
import { graphqlMiddleware } from '../middlewares';
import { GraphQLError } from 'graphql';

/**
 * Gets the middleware function promise
 *
 * @param connectionParams the connection params
 * @param wsServer the wsServer
 * @returns middleware function promise
 */
export default (connectionParams, wsServer: any) => {
  connectionParams.authToken = connectionParams.headers.authorization;
  if (connectionParams.authToken) {
    // console.log(
    //   'connectionParams.authToken ========>>',
    //   connectionParams.authToken
    // );
    // console.log('ws ===========>>>', ws);
    // ws.upgradeReq.headers.authorization = `Bearer ${connectionParams.authToken}`;
    // ws.upgradeReq.headers.authorization = connectionParams.authToken;
    // console.log('ws.upgradeReq.headers.authorization', JSON.stringify(ws));
    // return new Promise((res) => {
    //   graphqlMiddleware(ws.upgradeReq, {} as any, () => {
    //     res(ws.upgradeReq);
    //   });
    // });
    wsServer = {
      upgradeReq: {
        headers: {
          authorization: connectionParams.authToken,
        },
      },
    };
    return new Promise((res) => {
      graphqlMiddleware(wsServer.upgradeReq, {} as any, () => {
        res(wsServer.upgradeReq);
      });
    });

    // const data = graphqlMiddleware(
    //   connectionParams,
    //   {} as any,
    //   () => connectionParams
    // );
    // console.log('data ===========>>', JSON.stringify(data));
    // return data;
  } else {
    // throw new GraphQLError(
    //   i18next.t('common.errors.authenticationTokenNotFound')
    // );

    throw new GraphQLError('common.errors.authenticationTokenNotFound', {
      extensions: { code: 'common.errors.authenticationTokenNotFound' },
    });
  }
};
