// import config from 'config';
import config from 'config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Redis, RedisOptions } from 'ioredis';

let pubsub: RedisPubSub;

/** Redis configuration */
const options: RedisOptions = {
  password: config.get('redis.password'),
};

// pubsub = new AMQPPubSub({
//   connection: conn,
//   exchange: {
//     name: 'safe_subscriptions',
//     type: 'topic',
//     options: {
//       durable: true,
//       autoDelete: false,
//     },
//   },
//   queue: {
//     name: '',
//     options: {
//       // exclusive: true,
//       durable: true,
//       autoDelete: false,
//     },
//     unbindOnDispose: false,
//     deleteOnDispose: false,
//   },
// });

/**
 * GraphQL exchanges
 *
 * @returns a RabbitMQ publish/subscribe instance
 */
export default async () =>
  pubsub
    ? pubsub
    : new RedisPubSub({
        publisher: new Redis(config.get('redis.url'), options),
        subscriber: new Redis(config.get('redis.url'), options),
      });
