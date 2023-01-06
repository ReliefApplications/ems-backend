import { checkConfig } from '@utils/server/checkConfig.util';
import { get, isNil } from 'lodash';
// import config from 'config';

const mockGet = (setting: string) => {};

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    __esModule: true,
    ...originalConfig,
    get: mockGet,
  };
});

// get: jest.fn((setting: string) => {
//   console.log('get');
//   if (isNil(setting)) {
//     throw new Error('null or undefined argument');
//   }
//   const value = get(mockConfig, setting, undefined);
//   if (value === undefined) {
//     throw new Error('configuration property is undefined');
//   }
//   return value;
// }),

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
    // mockGet.mockClear();
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
      mockGet.mockImplementation((setting: string) => {
        console.log('get');
        if (isNil(setting)) {
          throw new Error('null or undefined argument');
        }
        const value = get(mockConfig, setting, undefined);
        if (value === undefined) {
          throw new Error('configuration property is undefined');
        }
        return value;
      });
      expect(() => checkConfig()).not.toThrow();
      expect(mockProcessExit).not.toHaveBeenCalled();
    });
  });

  // describe('Incorrect keys fail', () => {
  //   test('Empty string should fail', () => {
  //     const mockConfig = {
  //       server: {
  //         url: '',
  //       },
  //     };
  //     jest.mock('config', () => {
  //       return {
  //         __esModule: true,
  //         ...config,
  //         get: (setting: string) => {
  //           console.log('bliblio');
  //           if (isNil(setting)) {
  //             throw new Error('null or undefined argument');
  //           }
  //           const value = get(mockConfig, setting, undefined);
  //           if (value === undefined) {
  //             throw new Error('configuration property is undefined');
  //           }
  //           return value;
  //         },
  //       };
  //     });
  //     expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
  //     expect(mockProcessExit).toHaveBeenCalledTimes(1);
  //   });

  //   test('Null should fail', () => {
  //     const mockConfig = {
  //       server: {
  //         url: null,
  //       },
  //     };
  //     jest.mock('config', () => {
  //       return {
  //         __esModule: true,
  //         ...jest.requireActual('config'),
  //         get: (setting: string) => {
  //           console.log('bliblio');
  //           if (isNil(setting)) {
  //             throw new Error('null or undefined argument');
  //           }
  //           const value = get(mockConfig, setting, undefined);
  //           if (value === undefined) {
  //             throw new Error('configuration property is undefined');
  //           }
  //           return value;
  //         },
  //       };
  //     });
  //     expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
  //     expect(mockProcessExit).toHaveBeenCalledTimes(1);
  //   });

  //   test('Undefined should fail', () => {
  //     const mockConfig = {
  //       server: {
  //         url: undefined,
  //       },
  //     };
  //     jest.mock('config', () => {
  //       return {
  //         __esModule: true,
  //         ...jest.requireActual('config'),
  //         get: (setting: string) => {
  //           console.log('bliblio');
  //           if (isNil(setting)) {
  //             throw new Error('null or undefined argument');
  //           }
  //           const value = get(mockConfig, setting, undefined);
  //           if (value === undefined) {
  //             throw new Error('configuration property is undefined');
  //           }
  //           return value;
  //         },
  //       };
  //     });
  //     expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
  //     expect(mockProcessExit).toHaveBeenCalledTimes(1);
  //   });

  //   test('Missing key should fail', () => {
  //     const mockConfig = {
  //       server: {},
  //     };
  //     jest.mock('config', () => {
  //       return {
  //         __esModule: true,
  //         ...jest.requireActual('config'),
  //         get: (setting: string) => {
  //           console.log('bliblio');
  //           if (isNil(setting)) {
  //             throw new Error('null or undefined argument');
  //           }
  //           const value = get(mockConfig, setting, undefined);
  //           if (value === undefined) {
  //             throw new Error('configuration property is undefined');
  //           }
  //           return value;
  //         },
  //       };
  //     });
  //     expect(() => checkConfig()).toThrowErrorMatchingSnapshot();
  //     expect(mockProcessExit).toHaveBeenCalledTimes(1);
  //   });
  // });
});
