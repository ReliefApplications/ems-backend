import amqp from 'amqplib/callback_api';

function publishMessage(queue, message) {
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
            // eslint-disable-next-line no-undef
            channel.sendToQueue(queue, Buffer.from(message));
        });
        setTimeout(() => {
            connection.close();
        }, 500);
    });
}

export default publishMessage;
