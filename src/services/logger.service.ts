import winston, { transports, format } from 'winston';
import config from 'config';
import 'winston-daily-rotate-file';
import { isEmpty } from 'lodash';

/**
 * Custom format for logs.
 */
const customFormat = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (!isEmpty(metadata)) {
      msg += JSON.stringify(metadata);
    }
    return msg;
  }
);

/**
 * Options used to create transports
 */
const options = {
  fileInfo: {
    filename: 'combined-%DATE%.log',
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxFiles: '7d',
  },
  fileError: {
    filename: 'error-%DATE%.log',
    dirname: 'logs',
    level: 'error',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxFiles: '7d',
  },
};

/** List of winston transports */
const loggerTransports: winston.transport[] = [];

/** Store logs in files */
if (config.get('logger.keep') === true) {
  loggerTransports.push(new transports.DailyRotateFile(options.fileError));
  loggerTransports.push(new transports.DailyRotateFile(options.fileInfo));
}

/**
 * Colors the level outside production only: in production the console is read
 * raw ( App Service Log stream ), where color codes show up as noise.
 */
const colorize =
  process.env.NODE_ENV === 'production' ? [] : [format.colorize()];

//
// Log to the `console` in every environment, so the logs show up in the App Service Log stream,
// with the format: `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
loggerTransports.push(
  new transports.Console({
    format: format.combine(
      ...colorize,
      format.splat(),
      format.timestamp(),
      customFormat
    ),
  })
);

/**
 * Custom winston logger.
 * Use daily rotation to remove old log files.
 */
export const logger: any = winston.createLogger({
  level: 'info',
  format: format.combine(
    ...colorize,
    format.splat(),
    format.timestamp(),
    customFormat
  ),
  // defaultMeta: { service: 'user-service' },
  transports: loggerTransports,
});
