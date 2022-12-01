import { checkConfig } from '@utils/server/checkConfig.util';

describe('Check config util method', () => {
  describe('Correct keys work', () => {
    test('All valid keys should work', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process.exit: ' + number);
        });
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
      expect(mockExit).not.toHaveBeenCalled();
      mockExit.mockRestore();
    });
  });

  describe('Incorrect keys fail', () => {
    test('Empty string should fail', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process.exit: ' + number);
        });
      jest.mock('config', () => ({
        server: {
          url: '',
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledTimes(1);
      mockExit.mockRestore();
    });

    test('Null should fail', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process.exit: ' + number);
        });
      jest.mock('config', () => ({
        server: {
          url: null,
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledTimes(1);
      mockExit.mockRestore();
    });

    test('Undefined should fail', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process.exit: ' + number);
        });
      jest.mock('config', () => ({
        server: {
          url: undefined,
        },
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledTimes(1);
      mockExit.mockRestore();
    });

    test('Missing key should fail', () => {
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process.exit: ' + number);
        });
      jest.mock('config', () => ({
        server: {},
      }));
      expect(() => checkConfig()).toThrow();
      expect(mockExit).toHaveBeenCalledTimes(1);
      mockExit.mockRestore();
    });
  });
});
