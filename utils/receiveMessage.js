const amqp = require('amqplib/callback_api');

function receiveMessage(queue, handler) {
    amqp.connect('amqp://rabbitmq', (error0, connection) => {
        if (error0) {
            throw error0;
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1;
            }

            channel.assertQueue(queue, {
                durable: false
            });

            channel.consume(queue, (message) => {
                handler(message);
            }, {
                noAck: true
            });
        });
    });
}

module.exports = receiveMessage;
