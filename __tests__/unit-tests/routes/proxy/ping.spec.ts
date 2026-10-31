import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { AbilityBuilder, Ability, subject } from '@casl/ability';
import * as CryptoJS from 'crypto-js';
import axios from 'axios';
import { lookup } from 'dns/promises';
import { ApiConfiguration } from '@models';
import { getToken } from '@utils/proxy/authManagement';
import { authType } from '@const/enumTypes';
import proxy from '@routes/proxy';

jest.mock('@models');
jest.mock('axios');
jest.mock('dns/promises', () => ({ lookup: jest.fn() }));
jest.mock('@utils/proxy/authManagement');
jest.mock('@server/redis');
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
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/** Encryption key returned by the mocked config */
const ENCRYPTION_KEY = 'test-encryption-key';
/** Placeholder sent by the UI for settings that were not edited */
const SETTING_PLACEHOLDER = '●●●●●●●●●●●●●';
/** Role allowed to update the tested configuration */
const UPDATER_ROLE = new Types.ObjectId();
/** Stored (encrypted) settings of the tested configuration */
const STORED_SETTINGS = {
  authTargetUrl: 'https://login.example.com/token',
  apiClientID: 'stored-client-id',
  safeSecret: 'stored-secret',
  scope: 'api://stored/.default',
};
/** Public addresses returned by the mocked DNS for known hosts */
const DNS: Record<string, { address: string; family: number }[]> = {
  'api.example.com': [{ address: '93.184.216.34', family: 4 }],
  'login.example.com': [{ address: '93.184.216.35', family: 4 }],
  'internal.corp': [{ address: '10.0.0.5', family: 4 }],
};

/**
 * Build a CASL ability from a list of rules.
 *
 * @param rules rules granted to the user
 * @returns ability
 */
const buildAbility = (rules: [string, string, any?][]) => {
  // eslint-disable-next-line deprecation/deprecation
  const builder = new AbilityBuilder(Ability);
  rules.forEach(([action, type, conditions]) =>
    builder.can(action, type, conditions)
  );
  return builder.build();
};

/**
 * Build an API configuration as returned by mongoose.
 *
 * @param overrides fields to override
 * @returns api configuration-like object
 */
const buildApi = (overrides: any = {}) => {
  const id = new Types.ObjectId();
  return subject('ApiConfiguration', {
    _id: id,
    id: id.toHexString(),
    name: 'tested-api',
    authType: authType.serviceToService,
    endpoint: 'https://api.example.com',
    pingUrl: 'health',
    settings: CryptoJS.AES.encrypt(
      JSON.stringify(STORED_SETTINGS),
      ENCRYPTION_KEY
    ).toString(),
    permissions: { canUpdate: [UPDATER_ROLE] },
    ...overrides,
  });
};

/**
 * Mount the proxy router behind a middleware injecting the logged user.
 *
 * @param ability ability of the user to inject in the request context
 * @returns express app
 */
const buildApp = (ability: any) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.context = { user: { _id: new Types.ObjectId(), ability } };
    req.t = (key: string) => key;
    next();
  });
  app.use('/proxy', proxy);
  return app;
};

/** Back-office administrator: can_manage_api_configurations */
const adminAbility = buildAbility([
  ['create', 'ApiConfiguration'],
  ['read', 'ApiConfiguration'],
  ['update', 'ApiConfiguration'],
  ['delete', 'ApiConfiguration'],
]);
/** Regular user: every authenticated user can read API configurations */
const readerAbility = buildAbility([['read', 'ApiConfiguration']]);
/** User holding a role listed in the configuration's canUpdate permission */
const updaterAbility = buildAbility([
  ['read', 'ApiConfiguration'],
  [
    'update',
    'ApiConfiguration',
    { 'permissions.canUpdate': { $in: [UPDATER_ROLE] } },
  ],
]);

/**
 * Body sent by the API configuration page: the whole form, with placeholders for untouched secrets.
 *
 * @param api configuration being tested
 * @param overrides fields to override
 * @returns request body
 */
const pingBody = (api: any, overrides: any = {}) => ({
  id: api.id,
  name: api.name,
  authType: api.authType,
  endpoint: api.endpoint,
  pingUrl: api.pingUrl,
  settings: {
    authTargetUrl: SETTING_PLACEHOLDER,
    apiClientID: SETTING_PLACEHOLDER,
    safeSecret: SETTING_PLACEHOLDER,
    scope: SETTING_PLACEHOLDER,
  },
  ...overrides,
});

describe('POST /proxy/ping (C-01)', () => {
  let api: any;

  beforeEach(() => {
    jest.clearAllMocks();
    api = buildApi();
    (ApiConfiguration.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(api),
    });
    (lookup as jest.Mock).mockImplementation(async (hostname: string) => {
      if (!DNS[hostname]) {
        throw new Error('ENOTFOUND');
      }
      return DNS[hostname];
    });
    (getToken as jest.Mock).mockResolvedValue('upstream-token');
    (axios as unknown as jest.Mock).mockResolvedValue({
      status: 200,
      data: { access_token: 'leaked', internal: 'data' },
    });
  });

  it('refuses users who cannot update the configuration', async () => {
    const res = await request(buildApp(readerAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api, { endpoint: 'https://attacker.example' }));
    expect(res.status).toBe(403);
    expect(res.text).toBe('common.errors.permissionNotGranted');
    expect(getToken).not.toHaveBeenCalled();
    expect(axios).not.toHaveBeenCalled();
  });

  it('refuses users whose roles are not in the configuration canUpdate permission', async () => {
    api = buildApi({ permissions: { canUpdate: [new Types.ObjectId()] } });
    (ApiConfiguration.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(api),
    });
    const res = await request(buildApp(updaterAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api));
    expect(res.status).toBe(403);
    expect(axios).not.toHaveBeenCalled();
  });

  it('returns 404 when the configuration does not exist or no id is sent', async () => {
    (ApiConfiguration.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    let res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api));
    expect(res.status).toBe(404);
    res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send({ ...pingBody(api), id: undefined });
    expect(res.status).toBe(404);
    expect(axios).not.toHaveBeenCalled();
  });

  it('lets a user with update rights test the configuration, returning only the upstream status', async () => {
    const res = await request(buildApp(updaterAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 200 });
    expect(res.text).not.toContain('leaked');
    // Stored credentials are used when the body holds placeholders
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({
        authType: authType.serviceToService,
        settings: STORED_SETTINGS,
      }),
      undefined,
      true
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/health',
        method: 'GET',
        maxRedirects: 0,
      })
    );
  });

  it('uses the submitted values when they are not placeholders', async () => {
    const res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(
        pingBody(api, {
          endpoint: 'https://login.example.com',
          settings: {
            authTargetUrl: 'https://login.example.com/oauth2/token',
            apiClientID: 'new-client-id',
            safeSecret: SETTING_PLACEHOLDER,
            scope: SETTING_PLACEHOLDER,
          },
        })
      );
    expect(res.status).toBe(200);
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: {
          authTargetUrl: 'https://login.example.com/oauth2/token',
          apiClientID: 'new-client-id',
          safeSecret: STORED_SETTINGS.safeSecret,
          scope: STORED_SETTINGS.scope,
        },
      }),
      undefined,
      true
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://login.example.com/health' })
    );
  });

  it.each([
    ['http://10.0.0.5/api', 'private IPv4 literal'],
    ['http://127.0.0.1:8080', 'loopback'],
    ['http://169.254.169.254/metadata', 'cloud metadata service'],
    ['http://localhost:4000', 'localhost'],
    ['http://[::1]', 'IPv6 loopback'],
    ['http://internal.corp', 'hostname resolving to a private address'],
    ['http://unknown.example', 'unresolvable host'],
    ['ftp://api.example.com', 'unsupported scheme'],
  ])('refuses a non-public endpoint %s (%s)', async (endpoint) => {
    const res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api, { endpoint }));
    expect(res.status).toBe(400);
    expect(res.text).toBe('common.errors.invalidAPI');
    expect(getToken).not.toHaveBeenCalled();
    expect(axios).not.toHaveBeenCalled();
  });

  it('refuses a non-public authentication URL, so stored credentials are never posted to it', async () => {
    const res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(
        pingBody(api, {
          settings: {
            authTargetUrl: 'http://internal.corp/token',
            apiClientID: SETTING_PLACEHOLDER,
            safeSecret: SETTING_PLACEHOLDER,
            scope: SETTING_PLACEHOLDER,
          },
        })
      );
    expect(res.status).toBe(400);
    expect(getToken).not.toHaveBeenCalled();
    expect(axios).not.toHaveBeenCalled();
  });

  it('does not check the authentication URL for public APIs', async () => {
    api = buildApi({ authType: authType.public, settings: '' });
    (ApiConfiguration.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(api),
    });
    const res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api, { settings: {} }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 200 });
  });

  it('reports an unreachable API as unavailable', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED')
    );
    const res = await request(buildApp(adminAbility))
      .post('/proxy/ping/health')
      .send(pingBody(api));
    expect(res.status).toBe(503);
  });
});
