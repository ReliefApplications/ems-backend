import { createClient } from '@redis/client';
import config from 'config';
import { logger } from '@services/logger.service';

const redisClient = createClient({
  url: config.get('redis.url'),
});

redisClient.connect();

redisClient.on('ready', function () {
  logger.info('🚀 Redis is running...');
});
redisClient.on('error', function (err) {
  //logger.error(`🛑 Redis connect error: ${err}`);
});

export const set = async (key: string, value: any): Promise<any> => {
  return redisClient.set(key, value);
};

export const get = async (key: string): Promise<any> => {
  return redisClient.get(key);
};
