import amqp from 'amqplib/callback_api';
import { Application, Form, Record, Notification } from '../models';
import pubsub from './pubsub';

export default function subscriberSafe() {
    amqp.connect(`amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672?heartbeat=30`, (error0, connection) => {
        if (error0) {
            console.log('⏳ Waiting for rabbitmq server...');
            return setTimeout(subscriberSafe, 1000);
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
                console.log('⏳ Waiting for messages of SAFE.');
                channel.bindQueue(q.queue, exchange, '');
                channel.consume(q.queue, async (msg) => {
                    if (msg.content) {
                        const data = JSON.parse(msg.content.toString());
                        const applications = await Application.find({ 'subscriptions.routingKey': msg.fields.routingKey });
                        applications.forEach(application => {
                            application.subscriptions.filter(x => x.routingKey === msg.fields.routingKey).forEach(async (subscription) => {
                                if (subscription.convertTo) {
                                    const form = await Form.findById(subscription.convertTo);
                                    if (form) {
                                        const records = [];
                                        const publisher = await pubsub();
                                        if (Array.isArray(data)) {
                                            data.forEach(element => {
                                                records.push(new Record({
                                                    form: subscription.convertTo,
                                                    createdAt: new Date(),
                                                    modifiedAt: new Date(),
                                                    data: element.data,
                                                    resource: form.resource ? form.resource : null
                                                }));
                                            });
                                        } else {
                                            records.push(new Record({
                                                form: subscription.convertTo,
                                                createdAt: new Date(),
                                                modifiedAt: new Date(),
                                                data: data.data,
                                                resource: form.resource ? form.resource : null
                                            }));
                                        }
                                        Record.insertMany(records, {}, async (err, docs) => {
                                            if (subscription.channel) {
                                                const notification = new Notification({
                                                    action: `${records.length} ${form.name} created.`,
                                                    content: '',
                                                    createdAt: new Date(),
                                                    channel: subscription.channel.toString(),
                                                    seenBy: []
                                                });
                                                await notification.save();
                                                publisher.publish(subscription.channel.toString(), { notification });
                                            }
                                        });
                                    }
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
};
