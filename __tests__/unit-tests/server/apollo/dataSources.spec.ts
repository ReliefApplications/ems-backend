import { ApiConfiguration } from '@models';
import { authType } from '@const/enumTypes';
import { getToken } from '@utils/proxy';
import { CustomAPI, buildDataSource } from '@server/apollo/dataSources';

jest.mock('ioredis');
jest.mock('apollo-server-cache-redis', () => ({
  BaseRedisCache: jest.fn().mockImplementation(() => ({ get: jest.fn() })),
}));
jest.mock('@utils/proxy', () => ({ getToken: jest.fn() }));
jest.mock('@services/logger.service');

/** Delegated (authorization code) API configuration */
const apiConfiguration = {
  id: 'api-1',
  name: 'delegated-api',
  endpoint: 'https://upstream.example',
  graphQLEndpoint: 'graphql',
  authType: authType.authorizationCode,
} as unknown as ApiConfiguration;

/**
 * Simulates a request about to be sent by the data source.
 *
 * @returns request with empty headers
 */
const newRequest = () => ({ headers: {} as Record<string, string> } as any);

describe('CustomAPI data source (H-07)', () => {
  beforeEach(() => {
    (getToken as jest.Mock).mockReset();
    // The token exchange of request A takes longer than the one of request B,
    // so B completes while A is still awaiting: with a shared request slot,
    // A would end up with B's token.
    (getToken as jest.Mock).mockImplementation(
      async (_: ApiConfiguration, accessToken: string) => {
        await new Promise((resolve) =>
          setTimeout(resolve, accessToken === 'token-A' ? 30 : 0)
        );
        return `delegated-${accessToken}`;
      }
    );
  });

  it('keeps the upstream access token of each request under concurrency', async () => {
    const apiA = new CustomAPI({ accessToken: 'token-A' }, apiConfiguration);
    const apiB = new CustomAPI({ accessToken: 'token-B' }, apiConfiguration);
    const requestA = newRequest();
    const requestB = newRequest();

    await Promise.all([
      apiA.willSendRequest('/items', requestA),
      apiB.willSendRequest('/items', requestB),
    ]);

    expect(requestA.headers.authorization).toBe('Bearer delegated-token-A');
    expect(requestB.headers.authorization).toBe('Bearer delegated-token-B');
    expect(getToken).toHaveBeenCalledWith(apiConfiguration, 'token-A');
    expect(getToken).toHaveBeenCalledWith(apiConfiguration, 'token-B');
  });

  it('does not keep any reference to a shared server or request object', () => {
    const api = new CustomAPI({ accessToken: 'token-A' }, apiConfiguration);
    expect(api).not.toHaveProperty('server');
    expect(api).not.toHaveProperty('req');
  });

  it('exchanges an empty access token when the request carries none', async () => {
    const api = new CustomAPI({}, apiConfiguration);
    const request = newRequest();
    await api.willSendRequest('/items', request);
    expect(getToken).toHaveBeenCalledWith(apiConfiguration, '');
    expect(request.headers.authorization).toBe('Bearer delegated-');
  });

  it('does not authenticate the plain REST data source', async () => {
    const rest = new CustomAPI({ accessToken: 'token-A' });
    const request = newRequest();
    await rest.willSendRequest('/items', request);
    expect(getToken).not.toHaveBeenCalled();
    expect(request.headers.authorization).toBeUndefined();
  });

  it('hands the access token of the request to data sources built by name', async () => {
    jest
      .spyOn(ApiConfiguration, 'findOne')
      .mockResolvedValue(apiConfiguration as any);
    const sources = (
      await buildDataSource(apiConfiguration.name, { accessToken: 'token-B' })
    )();
    const request = newRequest();
    await sources[apiConfiguration.name].willSendRequest('/items', request);
    expect(request.headers.authorization).toBe('Bearer delegated-token-B');
  });
});
