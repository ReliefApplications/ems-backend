import { Notification, User } from '@models';
import { logger } from '@services/logger.service';
import config from 'config';
import getRedisClient from './redis';
import pubsub from './pubsub';

/** Redis channel on which the email function publishes its email events. */
const EMAIL_EVENT_CHANNEL: string = config.get('email.eventsChannel');

/** Payload published by the email function on the email events channel. */
interface EmailEvent {
  subject: string;
  html: string;
  emails: string[];
}

/**
 * Handle a single email event: create one notification per matched user and
 * publish it on the user's personal topic so it is delivered in real time
 * through the GraphQL notification subscription.
 *
 * @param event Parsed email event payload.
 */
const handleEmailEvent = async (event: EmailEvent): Promise<void> => {
  if (!event || !Array.isArray(event.emails) || event.emails.length === 0) {
    return;
  }
  // `username` holds the user's email, so we match recipients against it.
  const users = await User.find({ username: { $in: event.emails } });
  if (users.length === 0) {
    return;
  }
  const publisher = await pubsub();
  await Promise.all(
    users.map(async (user) => {
      const notification = new Notification({
        action: event.subject,
        content: { html: event.html, emails: event.emails },
        user: user._id,
        seenBy: [],
      });
      await notification.save();
      // The notification subscription listens on the user's id as a topic.
      publisher.publish(String(user._id), { notification });
    })
  );
};

/**
 * Subscribe to the email events channel published by the email function and
 * turn each event into per-user notifications.
 */
const emailEventSubscriber = async (): Promise<void> => {
  const client = await getRedisClient();
  if (!client) {
    logger.info('Redis not configured, email event subscriber will not start.');
    return;
  }
  // A node-redis client in subscriber mode cannot issue other commands, so we
  // duplicate the shared client to keep it dedicated to subscriptions.
  const subscriber = client.duplicate();
  subscriber.on('error', (error) =>
    logger.error(`Email event subscriber redis error: ${error}`)
  );
  await subscriber.connect();
  await subscriber.subscribe(EMAIL_EVENT_CHANNEL, async (message) => {
    try {
      const event: EmailEvent = JSON.parse(message);
      await handleEmailEvent(event);
    } catch (error) {
      logger.error(`Failed to handle email event: ${error.message}`, {
        stack: error.stack,
      });
    }
  });
  logger.info(
    `📧 Subscribed to "${EMAIL_EVENT_CHANNEL}" email events channel.`
  );
};

export default emailEventSubscriber;
