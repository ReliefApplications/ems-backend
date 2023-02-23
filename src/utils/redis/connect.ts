import { createClient } from '@redis/client';
import config from 'config';
import { logger } from '@services/logger.service';

/**
 * Create Redis Client Connection
 *
 * @returns Redis client connection
 */
const redisClient = createClient({
  url: config.get('redis.url'),
});

redisClient.connect();

redisClient.on('ready', function () {
  logger.info('🚀 Redis is running...');
});
redisClient.on('error', function () {
  //logger.error(`🛑 Redis connect error: ${err}`);
});

/**
 * Set value in the redis
 *
 * @param key is redis catch key for saving value in the redis
 * @param value is for saving value in the redis catch
 * @returns Redis client connection
 */
export const set = async (key: string, value: any): Promise<any> => {
  return redisClient.set(key, value);
};

/**
 * Get value in the redis
 *
 * @param key is redis catch key for getting stored value
 * @returns Redis client connection
 */
export const get = async (key: string): Promise<any> => {
  return redisClient.get(key);
};
