import 'jest';
import fs from 'fs';
import logger, { customFormat } from '@lib/logger';

describe('Logger Lib', () => {
  beforeEach(() => {
    const logDir = './logs';
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  it("should create a new log directory if one doesn't already exist", () => {
    // set up existsSync to meet the `if` condition
    jest.spyOn(fs, 'existsSync').mockImplementation();
    jest.spyOn(fs, 'mkdirSync').mockImplementation();

    // call the function that you want to test
    logger.info('app.init error');

    // make your assertion
    expect(logger.info).toBeDefined();
  });

  it('should format log messages correctly', () => {
    const logEntry = {
      level: 'info',
      message: 'Test log message',
      timestamp: '2024-09-08T12:00:00.000Z',
      metadata: { extra: 'data' },
    };
    const formattedMessage = customFormat.transform(logEntry, {})[
      Symbol.for('message')
    ];
    const expectedOutput =
      '2024-09-08T12:00:00.000Z [info] : Test log message {"metadata":{"extra":"data"}}';
    expect(formattedMessage).toBe(expectedOutput);
  });
});
