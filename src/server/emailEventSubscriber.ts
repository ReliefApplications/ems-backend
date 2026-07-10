import { Notification, User } from '@models';
import { logger } from '@services/logger.service';
import config from 'config';
import { createHash } from 'crypto';
import getRedisClient from './redis';
import pubsub from './pubsub';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Redis client type, as returned by the shared redis helper. */
type RedisClient = Awaited<ReturnType<typeof getRedisClient>>;

/** Redis channel on which the email function publishes its email events. */
const EMAIL_EVENT_CHANNEL: string = config.get('email.eventsChannel');

/**
 * Time-to-live, in seconds, of the dedupe lock that prevents several back-end
 * instances from processing the same email event. It only needs to outlive the
 * time it takes every instance to receive and try to claim the message.
 */
const DEDUPE_LOCK_TTL = 60;

/**
 * Claim an email event for processing, so that only one back-end instance
 * turns it into notifications when several are subscribed to the same channel
 * (Redis pub/sub broadcasts every message to every subscriber).
 *
 * The payload carries no id, so the lock key is derived from its content. A
 * byte-identical event published twice within the TTL would be claimed once;
 * this is an acceptable trade-off for guaranteed de-duplication across
 * instances. If the lock cannot be acquired (e.g. Redis error), we favour
 * delivery over de-duplication and process the event anyway.
 *
 * @param client Redis command client.
 * @param message Raw event message used to derive the lock key.
 * @returns Whether this instance should process the event.
 */
export const claimEvent = async (
  client: RedisClient,
  message: string
): Promise<boolean> => {
  try {
    const hash = createHash('sha256').update(message).digest('hex');
    const acquired = await client.set(`email-event:${hash}`, '1', {
      NX: true,
      EX: DEDUPE_LOCK_TTL,
    });
    return acquired === 'OK';
  } catch (error) {
    logger.error(`Failed to claim email event, processing anyway: ${error}`);
    return true;
  }
};

/** Payload published by the email function on the email events channel. */
export interface EmailEvent {
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
export const handleEmailEvent = async (event: EmailEvent): Promise<void> => {
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
      // Only one instance should turn the event into notifications.
      if (!(await claimEvent(client, message))) {
        return;
      }
      const event: EmailEvent = JSON.parse(message);
      await handleEmailEvent(event);
    } catch (error) {
      logger.error(`Failed to handle email event: ${getErrorMessage(error)}`, {
        stack: getErrorStack(error),
      });
    }
  });
  logger.info(
    `📧 Subscribed to "${EMAIL_EVENT_CHANNEL}" email events channel.`
  );
};

export default emailEventSubscriber;
