import { checkConfig } from '@utils/server/checkConfig.util';

describe('Check config util method', () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error('process.exit: ' + number);
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
    });
  });

  describe('Incorrect keys fail', () => {
    test('Empty string should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: '',
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledWith(-1);
    });

    test('Null should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: null,
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledWith(-1);
    });

    test('Undefined should fail', () => {
      jest.mock('config', () => ({
        server: {
          url: undefined,
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledWith(-1);
    });

    test('Missing key should fail', () => {
      jest.mock('config', () => ({
        server: {},
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledWith(-1);
    });
  });

  mockExit.mockRestore();
});
