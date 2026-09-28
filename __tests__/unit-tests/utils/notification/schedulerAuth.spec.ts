import axios from 'axios';
import { logger } from '@services/logger.service';
import { getToken } from '@utils/commonServices';
import { getAzureFunctionTokens } from '@utils/notification/schedulerAuth';

// The token endpoint is never hit for real: axios is fully mocked.
jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// The Common Services token has its own established fetcher; only the fact
// that it is delegated to is asserted here.
jest.mock('@utils/commonServices', () => ({
  getToken: jest.fn(),
}));

// commonServices credentials only exist as environment variables, so they are
// stubbed. The clientId is mutable so each test can use a fresh token-cache key.
const mockSettings = { clientId: 'client-a' };

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      switch (setting) {
        case 'commonServices.tokenEndpoint':
          return 'https://login.example.com/token';
        case 'commonServices.clientId':
          return mockSettings.clientId;
        case 'commonServices.clientSecret':
          return 'client-secret';
        default:
          return originalConfig.get(setting);
      }
    }),
    util: originalConfig.util,
  };
});

describe('getAzureFunctionTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue('cs-token');
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { access_token: 'backend-token', expires_in: 3600 },
    });
  });

  it('should return the backend token and the common services token', async () => {
    mockSettings.clientId = 'client-both';

    const tokens = await getAzureFunctionTokens();

    expect(tokens).toEqual({
      authorization: 'backend-token',
      accesstoken: 'cs-token',
    });
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('should request a client_credentials token for the backend /.default scope', async () => {
    mockSettings.clientId = 'client-scope';

    await getAzureFunctionTokens();

    expect(axios).toHaveBeenCalledTimes(1);
    const request = (axios as unknown as jest.Mock).mock.calls[0][0];
    expect(request).toEqual(
      expect.objectContaining({
        url: 'https://login.example.com/token',
        method: 'post',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
    expect(request.data).toContain('grant_type=client_credentials');
    expect(request.data).toContain('client_id=client-scope');
    expect(request.data).toContain(
      `scope=${encodeURIComponent('api://client-scope/.default')}`
    );
  });

  it('should cache the backend token and not request it twice', async () => {
    mockSettings.clientId = 'client-cache';

    const first = await getAzureFunctionTokens();
    const second = await getAzureFunctionTokens();

    expect(first.authorization).toBe('backend-token');
    expect(second.authorization).toBe('backend-token');
    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('should log and return no authorization when the token request fails', async () => {
    mockSettings.clientId = 'client-error';
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
    (axios as unknown as jest.Mock).mockRejectedValue(new Error('boom'));

    const tokens = await getAzureFunctionTokens();

    expect(tokens.authorization).toBeUndefined();
    expect(tokens.accesstoken).toBe('cs-token');
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to fetch Azure token',
      expect.objectContaining({ message: 'boom' })
    );
  });

  it('should not cache anything when the response holds no access token', async () => {
    mockSettings.clientId = 'client-empty';
    (axios as unknown as jest.Mock).mockResolvedValue({ data: {} });

    const first = await getAzureFunctionTokens();
    const second = await getAzureFunctionTokens();

    expect(first.authorization).toBeUndefined();
    expect(second.authorization).toBeUndefined();
    // No token was cached, so the second call retries the endpoint.
    expect(axios).toHaveBeenCalledTimes(2);
  });
});
