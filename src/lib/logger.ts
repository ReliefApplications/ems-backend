import winston, { transports, format } from 'winston';
import config from 'config';
import 'winston-daily-rotate-file';
import { isEmpty } from 'lodash';

/** Directory for logs */
const logDir = './logs';

/**
 * Custom format for logs.
 */
export const customFormat = format.printf(
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
    filename: `${logDir}/combined-%DATE%.log`,
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxFiles: '7d',
  },
  fileError: {
    filename: `${logDir}/error-%DATE%.log`,
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

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (config.util.getEnv('NODE_ENV') !== 'production') {
  loggerTransports.push(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.splat(),
        format.timestamp(),
        customFormat
      ),
    })
  );
}

/**
 * Custom winston logger.
 * Use daily rotation to remove old log files.
 */
export const logger: any = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.splat(),
    format.timestamp(),
    customFormat
  ),
  // defaultMeta: { service: 'user-service' },
  transports: loggerTransports,
});

export default logger;
