import i18next from 'i18next';
import { graphqlMiddleware } from '../middlewares';
import { GraphQLError } from 'graphql';
import { Context } from 'graphql-ws';
import { IncomingMessage } from 'http';

/**
 * Gets the middleware function promise
 *
 * @param ctx Context object
 * @returns middleware function promise
 */
export default (ctx: Context) => {
  const { connectionParams } = ctx;
  // Check if request is present in the extra object
  if (
    connectionParams.authToken &&
    typeof ctx.extra === 'object' &&
    'request' in ctx.extra &&
    ctx.extra.request instanceof IncomingMessage
  ) {
    const request = ctx.extra.request;
    request.headers.authorization = `Bearer ${connectionParams.authToken}`;
    return new Promise((res, rej) => {
      graphqlMiddleware(request, {} as any, () => {
        // The middleware calls next() even when the token is invalid: refuse the connection then
        if (!(request as any).user) {
          rej(
            new GraphQLError(i18next.t('common.errors.userNotLogged'), {
              extensions: {
                code: 'UNAUTHENTICATED',
              },
            })
          );
          return;
        }
        res(request);
      });
    });
  }

  throw new GraphQLError(
    i18next.t('common.errors.authenticationTokenNotFound'),
    {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    }
  );
};
