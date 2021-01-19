import amqp from 'amqplib/callback_api';
import { Application, Record } from '../models';

export default () => amqp.connect(`amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672?heartbeat=30`, (error0, connection) => {
    if (error0) {
        throw error0;
    }
    connection.createChannel((error1, channel) => {
        if (error1) {
            throw error1;
        }
        const exchange = 'safe';
        channel.assertExchange(exchange, 'fanout', {
            durable: true
        });
        channel.assertQueue('', {
            exclusive: true
        }, (error2, q) => {
            if (error2) {
                throw error2;
            }
            console.log('[*] Waiting for messages of SAFE.');
            let i = 0;
            channel.bindQueue(q.queue, exchange, '');
            channel.consume(q.queue, async (msg) => {
                console.log(msg);
                if (msg.content) {
                    console.log(`Message - ${i} received.`);
                    i++;
                    const data = JSON.parse(msg.content.toString());
                    const applications = await Application.find({ 'subscriptions.routingKey': msg.fields.routingKey });
                    applications.forEach(application => {
                        console.log(application);
                        application.subscriptions.filter(x => x.routingKey === msg.fields.routingKey).forEach(subscription => {
                            if (subscription.convertTo) {
                                const records = [];
                                if (Array.isArray(data)) {
                                    data.forEach(element => {
                                        records.push(new Record({
                                            form: subscription.convertTo,
                                            createdAt: new Date(),
                                            modifiedAt: new Date(),
                                            data: element.data,
                                            resource: null,
                                        }));
                                    });
                                } else {
                                    records.push(new Record({
                                        form: subscription.convertTo,
                                        createdAt: new Date(),
                                        modifiedAt: new Date(),
                                        data: data.data,
                                        resource: null,
                                    }));
                                }
                                Record.insertMany(records, {}, (err, docs) => {
                                    console.log('inserted');
                                })
                            }
                        });
                    });
                }
            }, {
                noAck: true
            });
        })
    })
})