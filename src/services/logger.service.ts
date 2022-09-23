import winston from 'winston';
import config from 'config';
import 'winston-daily-rotate-file';

/**
 * Custom format for logs.
 */
const customFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message} `;
    if (metadata) {
      msg += JSON.stringify(metadata);
    }
    return msg;
  }
);

/**
 * Custom winston logger.
 * Use daily rotation to remove old log files.
 */
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp(),
    customFormat
  ),
  // defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error-<date>.log`
    // - Write all logs with importance level of `info` or less to `combined-<date>.log`
    //
    new winston.transports.DailyRotateFile({
      filename: 'error-%DATE%.log',
      dirname: 'logs',
      level: 'error',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxFiles: '7d',
    }),
    new winston.transports.DailyRotateFile({
      filename: 'combined-%DATE%.log',
      dirname: 'logs',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxFiles: '7d',
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (config.util.getEnv('NODE_ENV') !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.timestamp(),
        customFormat
      ),
    })
  );
}

logger.log({
  level: 'info',
  message: 'this is a test',
});
