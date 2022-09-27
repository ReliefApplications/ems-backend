import { logger } from 'express-winston';
import { transports, format } from 'winston';
import config from 'config';

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
  return `${timestamp} [${level}] [${statusCode}] in ${responseTime}ms: ${message}`;
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
    maxFiles: 5,
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

export let winstonLogger: any;
if (config.util.getEnv('NODE_ENV') !== 'production') {
  winstonLogger = logger({
    transports: [
      new transports.Console(),
      new transports.DailyRotateFile(options.fileError),
      new transports.DailyRotateFile(options.fileInfo),
    ],
    requestFilter: customRequestFilter,
    level: (info): string => {
      if (info.res.statusCode <= 400) {
        return 'info';
      }
      return 'error';
    },
    format: format.combine(
      format.colorize(), //Needs to be at the first position, otherwise there will be no colors.
      format.timestamp(),
      customFormat
    ),
  });
} else {
  winstonLogger = logger({
    transports: [
      new transports.DailyRotateFile(options.fileError),
      new transports.DailyRotateFile(options.fileInfo),
    ],
    requestFilter: customRequestFilter,
    level: (info): string => {
      if (info.res.statusCode <= 400) {
        return 'info';
      }
      return 'error';
    },
    format: format.combine(
      format.colorize(), //Needs to be at the first position, otherwise there will be no colors.
      format.timestamp(),
      customFormat
    ),
  });
}
