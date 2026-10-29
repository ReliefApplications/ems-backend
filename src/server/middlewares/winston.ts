import expressWinston from 'express-winston';
import { transports, format } from 'winston';
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
// Log to the `console` in every environment, so the logs show up in the App Service Log stream,
// with the format: `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
loggerTransports.push(new transports.Console());

/**
 * Colors the level outside production only: in production the console is read
 * raw ( App Service Log stream ), where color codes show up as noise.
 */
const colorize =
  process.env.NODE_ENV === 'production' ? [] : [format.colorize()];

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
    ...colorize, //Needs to be at the first position, otherwise there will be no colors.
    format.timestamp(),
    customFormat
  ),
  transports: loggerTransports,
});
