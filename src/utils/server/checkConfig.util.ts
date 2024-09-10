import { logger } from '@lib/logger';
import config from 'config';
import { isNil } from 'lodash';

/** List all mandatory config keys */
const mandatoryConfigKeys = [
  // server
  'server.url',
  'server.allowedOrigins',
  // front-office
  'frontOffice.uri',
  // back-office
  'backOffice.uri',
  // database
  'database.provider',
  'database.prefix',
  'database.host',
  'database.name',
  'database.user',
  'database.pass',
];

/**
 * Check config is valid
 */
export const checkConfig = () => {
  try {
    for (const key of mandatoryConfigKeys) {
      const value = config.get(key);
      if (isNil(value) || (typeof value === 'string' && value.length === 0)) {
        throw new Error(`Configuration property ${key} is null or undefined`);
      }
    }
  } catch (err) {
    logger.error(err.message);
    process.exit();
  }
};
