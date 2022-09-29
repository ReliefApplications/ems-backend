import expressWinston from 'express-winston';
import { transports, format } from 'winston';
import config from 'config';
import winston from 'winston';

/**
 * This function is used to filter request header before displaying it
 *
 * @param req http request
 * @param propName name of the property
 * @returns filtered property
 */
function customRequestFilter(req, propName) {
  if (propName !== 'headers') {
    return req[propName];
  }
  const { authorization, ...rest } = req.headers;
  return rest;
}

/**
 * Format used for winston logger
 */
const customFormat = format.printf((info) => {
  const { timestamp, level, message, meta } = info;
  const statusCode = meta.res.statusCode;
  const responseTime = meta.responseTime;
  return `${timestamp} [${level}] [${statusCode}] in ${responseTime}ms : ${message}`;
});

/**
 * Options used to create transports
 */
const options = {
  fileInfo: {
    level: 'info',
    filename: 'express-combined-%DATE%.log',
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxFiles: '7d',
    colorize: false,
  },
  fileError: {
    level: 'error',
    filename: 'express-error-%DATE%.log',
    dirname: 'logs',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxFiles: 5,
    colorize: false,
  },
};

/** List of winston transports */
const loggerTransports: winston.transport[] = [
  new transports.DailyRotateFile(options.fileError),
  new transports.DailyRotateFile(options.fileInfo),
];

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (config.util.getEnv('NODE_ENV') !== 'production') {
  loggerTransports.push(new transports.Console());
}

/**
 * Custom winston logger.
 * Use daily rotation to remove old log files.
 */
export const winstonLogger = expressWinston.logger({
  level: (info): string => {
    if (info.res.statusCode <= 400) {
      return 'info';
    }
    return 'error';
  },
  requestFilter: customRequestFilter,
  format: format.combine(
    format.colorize(), //Needs to be at the first position, otherwise there will be no colors.
    format.timestamp(),
    customFormat
  ),
  transports: loggerTransports,
});
