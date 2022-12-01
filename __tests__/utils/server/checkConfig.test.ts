import { checkConfig } from '@utils/server/checkConfig.util';

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
    test('All valid keys should work', () => {
      jest.mock('config', () => ({
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
      }));
      expect(() => checkConfig()).not.toThrow();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  describe('Incorrect keys fail', () => {
    test('Empty string should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: '',
        },
      }));
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Null should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: null,
        },
      }));
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Undefined should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: undefined,
        },
      }));
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });

    test('Missing key should fail', () => {
      jest.mock('config', () => ({
        server: {},
      }));
      expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
      expect(mockProcessExit).toHaveBeenCalledTimes(1);
    });
  });
});
