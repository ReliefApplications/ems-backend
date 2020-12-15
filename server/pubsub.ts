// https://github.com/Surnet/graphql-amqp-subscriptions
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';

let pubsub;

amqp.connect('amqp://admin:admin@localhost:5672?heartbeat=30')
.then(conn => {
  pubsub = new AMQPPubSub({
    connection: conn
    /* exchange: {
       name: 'exchange',
       type: 'topic',
       options: {
         durable: false,
         autoDelete: true
       }
     },
     queue: {
       name: 'queue'
       options: {
         exclusive: true,
         durable: true,
         autoDelete: true
       },
       unbindOnDispose: false;
       deleteOnDispose: false;
     } */
  });
  // Use the pubsub instance from here on
})
.catch(err => {
  console.error(err);
});

export default pubsub;