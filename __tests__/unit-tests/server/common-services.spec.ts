import Axios from 'axios';
import {
  setupCache,
  buildKeyGenerator,
} from 'axios-cache-interceptor';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
jest.mock('axios-cache-interceptor', () => ({
  setupCache: jest.fn(),
  buildKeyGenerator: jest.fn(),
}));

// Imported after the mocks so the module picks up the mocked dependencies.
// Required lazily inside each test via jest.isolateModules to reset the
// module-level memoized instance between assertions.
const loadModule = () => {
  let factory: () => any;
  jest.isolateModules(() => {
    factory = require('@server/common-services').default;
  });
  return factory;
};

describe('common-services axios instance', () => {
  const instance = { name: 'raw-instance' };
  const cachedInstance = { name: 'cached-instance' };
  const keyGenerator = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Axios.create as jest.Mock).mockReturnValue(instance);
    (setupCache as jest.Mock).mockReturnValue(cachedInstance);
    (buildKeyGenerator as jest.Mock).mockReturnValue(keyGenerator);
  });

  it('should create a cached axios instance with the expected configuration', () => {
    const getAxios = loadModule();
    const result = getAxios();

    expect(Axios.create).toHaveBeenCalledTimes(1);
    expect(setupCache).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({
        methods: ['get', 'post'],
        interpretHeader: false,
        generateKey: keyGenerator,
      })
    );
    expect(result).toBe(cachedInstance);
  });

  it('should memoize the instance and not recreate it on subsequent calls', () => {
    const getAxios = loadModule();
    const first = getAxios();
    const second = getAxios();

    expect(first).toBe(second);
    expect(Axios.create).toHaveBeenCalledTimes(1);
    expect(setupCache).toHaveBeenCalledTimes(1);
  });

  it('should build a cache key from the request identity fields', () => {
    const getAxios = loadModule();
    getAxios();

    const mapRequestToKey = (buildKeyGenerator as jest.Mock).mock.calls[0][0];
    const request = {
      method: 'get',
      baseURL: 'https://example.com',
      params: { a: 1 },
      url: '/resource',
      data: { payload: true },
      headers: { Authorization: 'Bearer token' },
    };

    expect(mapRequestToKey(request)).toEqual({
      method: 'get',
      baseURL: 'https://example.com',
      params: { a: 1 },
      url: '/resource',
      data: { payload: true },
      custom: 'Bearer token',
    });
  });
});
