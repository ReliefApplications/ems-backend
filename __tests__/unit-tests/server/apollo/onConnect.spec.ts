import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { graphqlMiddleware } from '@server/middlewares';
import onConnect from '@server/apollo/onConnect';

jest.mock('@server/middlewares', () => ({ graphqlMiddleware: jest.fn() }));
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/**
 * Builds a graphql-ws context carrying the given connection params.
 *
 * @param connectionParams connection params sent by the client
 * @returns context
 */
const buildContext = (connectionParams: any): any => ({
  connectionParams,
  extra: { request: new IncomingMessage(new Socket()) },
});

describe('WebSocket onConnect (L-05)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the request once the middleware attached a user', async () => {
    (graphqlMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { _id: 'user' };
      next();
    });
    const context = buildContext({ authToken: 'valid' });
    await expect(onConnect(context)).resolves.toBe(context.extra.request);
    expect(context.extra.request.headers.authorization).toBe('Bearer valid');
  });

  it('rejects the connection when the token does not authenticate anyone', async () => {
    (graphqlMiddleware as jest.Mock).mockImplementation((_req, _res, next) =>
      next()
    );
    await expect(
      onConnect(buildContext({ authToken: 'invalid' }))
    ).rejects.toMatchObject({
      message: 'common.errors.userNotLogged',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects the connection when no token is sent', () => {
    expect(() => onConnect(buildContext({}))).toThrow(
      'common.errors.authenticationTokenNotFound'
    );
    expect(graphqlMiddleware).not.toHaveBeenCalled();
  });
});
