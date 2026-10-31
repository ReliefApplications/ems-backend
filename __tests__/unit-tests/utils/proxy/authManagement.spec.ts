import axios from 'axios';
import { Types } from 'mongoose';
import { authType } from '@const/enumTypes';
import { cache, getToken, getTokenID } from '@utils/proxy/authManagement';

jest.mock('axios');
jest.mock('@services/logger.service');
jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    get: jest.fn((key: string) =>
      key === 'encryption.key' ? 'test-encryption-key' : actual.get(key)
    ),
    has: jest.fn((key: string) => actual.has(key)),
    util: actual.util,
  };
});

/** Decrypted settings, as passed by the ping route */
const SETTINGS = {
  authTargetUrl: 'https://login.example.com/token',
  apiClientID: 'client-id',
  safeSecret: 'secret',
  scope: 'api://x/.default',
};

/**
 * Build a service-to-service API configuration with decrypted settings.
 *
 * @returns api configuration-like object
 */
const buildApi = () => ({
  id: new Types.ObjectId().toHexString(),
  authType: authType.serviceToService,
  settings: SETTINGS,
});

describe('getToken on ping requests (C-01)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: { access_token: 'fresh-token', expires_in: 3600 },
    });
  });

  it('ignores the cached token and requests a fresh one', async () => {
    const api: any = buildApi();
    cache.set(getTokenID(api.id), 'cached-token');
    await expect(getToken(api, undefined, true)).resolves.toBe('fresh-token');
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: SETTINGS.authTargetUrl,
        method: 'post',
        maxRedirects: 0,
      })
    );
  });

  it('never writes the obtained token in the shared cache', async () => {
    const api: any = buildApi();
    cache.set(getTokenID(api.id), 'cached-token');
    await getToken(api, undefined, true);
    expect(cache.get(getTokenID(api.id))).toBe('cached-token');
    cache.flushAll();
    await getToken(api, undefined, true);
    expect(cache.get(getTokenID(api.id))).toBeUndefined();
  });

  it('does not cache a user-to-service token either', async () => {
    const api: any = {
      id: new Types.ObjectId().toHexString(),
      authType: authType.userToService,
      settings: { token: 'bearer' },
    };
    await expect(getToken(api, undefined, true)).resolves.toBe('bearer');
    expect(cache.get(getTokenID(api.id))).toBeUndefined();
  });

  it('keeps using the cache for regular proxy requests', async () => {
    const api: any = buildApi();
    cache.set(getTokenID(api.id), 'cached-token');
    await expect(getToken(api)).resolves.toBe('cached-token');
    expect(axios).not.toHaveBeenCalled();
  });
});
