import { checkConfig } from '@utils/server/checkConfig.util';
import config from 'config';
import { get, isNil } from 'lodash';

/**
 * Avoid process.exit to be called.
 */
const mockProcessExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((code) => {
    throw new Error(`Process.exit(${code})`); // Forces the code to throw instead of exit
  });

jest.mock('config', () => {
  return {
    _esModule: true,
    ...{ ...config },
  };
});

describe('Check config util method', () => {
  beforeEach(() => {
    mockProcessExit.mockClear();
  });

  describe('Correct keys work', () => {
    test('All valid keys should work', () => {
      const mockConfig = {
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
      jest.spyOn(config, 'get').mockImplementation((property) => {
        if (isNil(property)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, property, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });

      expect(() => checkConfig()).not.toThrow();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Incorrect keys fail', () => {
    test('Empty string should fail', () => {
      const mockConfig = {
        server: {
          url: '',
        },
      };
      jest.spyOn(config, 'get').mockImplementation((property) => {
        if (isNil(property)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, property, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Null should fail', () => {
      const mockConfig = {
        server: {
          url: null,
        },
      };
      jest.spyOn(config, 'get').mockImplementation((property) => {
        if (isNil(property)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, property, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Undefined should fail', () => {
      const mockConfig = {
        server: {
          url: undefined,
        },
      };
      jest.spyOn(config, 'get').mockImplementation((property) => {
        if (isNil(property)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, property, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Missing key should fail', () => {
      const mockConfig = {
        server: {},
      };
      jest.spyOn(config, 'get').mockImplementation((property) => {
        if (isNil(property)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, property, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });
  });
});
