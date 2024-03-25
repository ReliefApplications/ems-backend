import { RedisClientType, createClient } from 'redis';
import { logger } from '@services/logger.service';
import config from 'config';

let client: RedisClientType;

/**
 * Get a redis client.
 *
 * @returns a Redis client instance.
 */
export default async () => {
  if (!client && config.get('redis.url')) {
    client = createClient({
      url: config.get('redis.url'),
      password: config.get('redis.password'),
    });

    client.on('error', (error) => {
      logger.error(`REDIS: ${error}`);
    });
    client.on('disconnect', (error) => {
      logger.info(`REDIS: ${error}`);
      client = null;
    });

    await client.connect();
  }

  return client;
};
