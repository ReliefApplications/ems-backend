import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';

let pubsub: AMQPPubSub;

// graphql_exchanges
export default async () =>
  pubsub
    ? pubsub
    : amqp
        .connect(
          `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672?heartbeat=30`
        )
        .then((conn) => {
          pubsub = new AMQPPubSub({
            connection: conn,
            exchange: {
              name: `${process.env.RABBITMQ_APPLICATION}_notifications`,
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
