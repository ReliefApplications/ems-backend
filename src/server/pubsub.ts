import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';

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
          `amqp://${config.get('rabbitmq.user')}:${config.get('rabbitmq.pass')}@rabbitmq:5672?heartbeat=30`
        )
        .then((conn) => {
          pubsub = new AMQPPubSub({
            connection: conn,
            exchange: {
              name: `${config.get('rabbitmq.application')}_notifications`,
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
