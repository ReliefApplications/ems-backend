import { logger } from '@lib/logger';
import config from 'config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

let pubsub: RedisPubSub;

/**
 * Get a redis client.
 *
 * @returns Redis client.
 */
const getClient = () => {
  const client = new Redis(config.get('redis.url'), {
    password: config.get('redis.password'),
    showFriendlyErrorStack: true,
    lazyConnect: true,
    maxRetriesPerRequest: 5,
  });
  client.on('connect', () => {
    logger.info('Connected to redis instance');
  });
  client.on('ready', function () {
    logger.info('Redis instance is ready');
  });
  client.on('error', function (e) {
    logger.error(`Error connecting to redis: "${e}"`);
  });
  client.on('disconnect', () => {
    logger.info('Disconnected from redis instance');
  });
  return client;
};

/**
 * GraphQL exchanges
 *
 * @returns a Redis publish/subscribe instance
 */
export default async () => {
  if (!pubsub) {
    pubsub = new RedisPubSub({
      publisher: getClient(),
      subscriber: getClient(),
    });
  }
  return pubsub;
};
