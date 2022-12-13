import cors from 'cors';
import i18next from 'i18next';
import config from 'config';

/**
 * Must be stored in config file, as an array of strings
 */
const allowedOrigins: string[] = config.get('server.allowedOrigins');

/** The cors middleware */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = i18next.t('server.middlewares.cors.errors.invalidCORS');
      return callback(new Error(`${msg}: ${origin}`), false);
    }
    return callback(null, true);
  },
});
