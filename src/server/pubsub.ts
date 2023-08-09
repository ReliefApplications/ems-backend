import config from 'config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Redis, RedisOptions } from 'ioredis';

let pubsub: RedisPubSub;

/** Redis configuration */
const options: RedisOptions = {
  password: config.get('redis.password'),
};

/**
 * GraphQL exchanges
 *
 * @returns a RabbitMQ publish/subscribe instance
 */
// export default async () =>
//   pubsub
//     ? pubsub
//     : amqp
//         .connect(
//           `amqp://${config.get('rabbitMQ.user')}:${config.get(
//             'rabbitMQ.pass'
//           )}@${config.get('rabbitMQ.host')}:${config.get(
//             'rabbitMQ.port'
//           )}?heartbeat=30`
//         )
//         .then((conn) => {
//           pubsub = new AMQPPubSub({
//             connection: conn,
//             exchange: {
//               name: `${config.get('rabbitMQ.application')}_notifications`,
//               type: 'topic',
//               options: {
//                 durable: true,
//                 autoDelete: false,
//               },
//             },
//             queue: {
//               name: '',
//               options: {
//                 // exclusive: true,
//                 durable: true,
//                 autoDelete: true,
//               },
//               unbindOnDispose: false,
//               deleteOnDispose: false,
//             },
//           });
//           return pubsub;
//         });

export default async () =>
  pubsub
    ? pubsub
    : new RedisPubSub({
        publisher: new Redis(config.get('redis.url'), options),
        subscriber: new Redis(config.get('redis.url'), options),
      });
