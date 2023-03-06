import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';
import config from 'config';

let pubsub: AMQPPubSub;

/**
 * GraphQL exchanges
 *
 * @returns a RabbitMQ publish/subscribe instance
 */
export default async () =>
  pubsub
    ? pubsub
    : amqp
        .connect(
          `amqp://${config.get('rabbitMQ.user')}:${config.get(
            'rabbitMQ.pass'
          )}@rabbitmq:5672?heartbeat=30`
        )
        .then((conn) => {
          pubsub = new AMQPPubSub({
            connection: conn,
            exchange: {
              name: `${config.get('rabbitMQ.application')}_notifications`,
              type: 'topic',
              options: {
                durable: true,
                autoDelete: false,
              },
            },
            queue: {
              name: '',
              options: {
                // exclusive: true,
                durable: true,
                autoDelete: true,
              },
              unbindOnDispose: false,
              deleteOnDispose: false,
            },
          });
          return pubsub;
        });
