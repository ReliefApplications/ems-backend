import { checkConfig } from '@utils/server/checkConfig.util';
import { get, isNil } from 'lodash';

let mockConfig;

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      if (isNil(setting)) {
        throw new Error('null or undefined argument');
      }
      const value = get(mockConfig, setting, undefined);
      if (value === undefined) {
        throw new Error('configuration property is undefined');
      }
      return value;
    }),
  };
});

/**
 * Avoid process.exit to be called.
 */
const mockProcessExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((code) => {
    throw new Error(`Process.exit(${code})`); // Forces the code to throw instead of exit
  });

describe('Check config util method', () => {
  beforeEach(() => {
    mockProcessExit.mockClear();
  });

  describe('Correct keys work', () => {
    mockConfig = {
      server: {
        url: 'mock',
        allowedOrigins: 'mock',
      },
      frontOffice: {
        uri: 'mock',
      },
      backOffice: {
        uri: 'mock',
      },
      database: {
        provider: 'mock',
        prefix: 'mock',
        host: 'mock',
        port: 'mock',
        name: 'mock',
        user: 'mock',
        pass: 'mock',
      },
    };
    test('All valid keys should work', () => {
      expect(() => checkConfig()).not.toThrow();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Incorrect keys fail', () => {
    test('Empty string should fail', () => {
      mockConfig = {
        server: {
          url: '',
        },
      };
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Null should fail', () => {
      mockConfig = {
        server: {
          url: null,
        },
      };
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Undefined should fail', () => {
      mockConfig = {
        server: {
          url: undefined,
        },
      };
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Missing key should fail', () => {
      mockConfig = {
        server: {},
      };
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });
  });
});
