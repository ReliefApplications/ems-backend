import winston, { transports, format } from 'winston';
import config from 'config';
import 'winston-daily-rotate-file';

/**
 * Custom format for logs.
 */
const customFormat = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (metadata) {
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
const loggerTransports: winston.transport[] = [
  new transports.DailyRotateFile(options.fileError),
  new transports.DailyRotateFile(options.fileInfo),
];

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
const logger: any = winston.createLogger({
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

logger.error = (err) => {
  if (err instanceof Error) {
    logger.log({ level: 'error', message: `${err.stack || err}` });
  } else {
    logger.log({ level: 'error', message: err });
  }
};

export { logger };
