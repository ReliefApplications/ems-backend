import { createHash } from 'crypto';
import { Notification, User } from '@models';
import { logger } from '@services/logger.service';
import getRedisClient from '@server/redis';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/** Captures the published GraphQL notification topics/payloads. */
const mockPublish = jest.fn();

// The notification subscription delivery layer is mocked: we only assert which
// topic/payload would be published, not the real Redis exchange.
jest.mock('@server/pubsub', () => ({
  __esModule: true,
  default: jest.fn(async () => ({ publish: mockPublish })),
}));

// The shared Redis client is mocked so the subscriber wiring can be driven
// without a real Redis instance.
jest.mock('@server/redis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import emailEventSubscriber, {
  claimEvent,
  handleEmailEvent,
} from '@server/emailEventSubscriber';

describe('emailEventSubscriber', () => {
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEmailEvent', () => {
    /** Build a valid email event payload. */
    const buildEvent = (emails: string[]) => ({
      subject: 'Weekly report',
      html: '<p>Hello</p>',
      emails,
    });

    it('should do nothing if the event has no recipients', async () => {
      await handleEmailEvent(buildEvent([]));
      expect(await Notification.countDocuments()).toBe(0);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should do nothing if the event is malformed', async () => {
      await handleEmailEvent({} as any);
      expect(await Notification.countDocuments()).toBe(0);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should do nothing if no user matches the recipient emails', async () => {
      await User.create({ username: 'someone@who.int', name: 'Someone' });
      await handleEmailEvent(buildEvent(['nobody@who.int']));
      expect(await Notification.countDocuments()).toBe(0);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should create one notification per matched user with subject/content', async () => {
      const user = await User.create({
        username: 'recipient@who.int',
        name: 'Recipient',
      });
      const event = buildEvent(['recipient@who.int']);

      await handleEmailEvent(event);

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual(
        expect.objectContaining({
          action: event.subject,
          content: { html: event.html, emails: event.emails },
        })
      );
      expect(String(notifications[0].user)).toBe(String(user._id));
      expect(notifications[0].channel).toBeUndefined();
    });

    it("should publish the notification on the user's personal topic", async () => {
      const user = await User.create({
        username: 'recipient@who.int',
        name: 'Recipient',
      });

      await handleEmailEvent(buildEvent(['recipient@who.int']));

      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({
          notification: expect.objectContaining({ action: 'Weekly report' }),
        })
      );
    });

    it('should only notify users whose email matches, ignoring the rest', async () => {
      const matched = await User.create({
        username: 'match@who.int',
        name: 'Match',
      });
      await User.create({ username: 'other@who.int', name: 'Other' });

      await handleEmailEvent(
        buildEvent(['match@who.int', 'unknown@who.int'])
      );

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(String(notifications[0].user)).toBe(String(matched._id));
    });

    it('should notify every matched user when several recipients exist', async () => {
      await User.create([
        { username: 'a@who.int', name: 'A' },
        { username: 'b@who.int', name: 'B' },
      ]);

      await handleEmailEvent(buildEvent(['a@who.int', 'b@who.int']));

      expect(await Notification.countDocuments()).toBe(2);
      expect(mockPublish).toHaveBeenCalledTimes(2);
    });
  });

  describe('claimEvent', () => {
    const message = JSON.stringify({ subject: 's', html: 'h', emails: [] });
    const expectedKey = `email-event:${createHash('sha256')
      .update(message)
      .digest('hex')}`;

    it('should claim the event and set a TTL lock when the key is free', async () => {
      const client = { set: jest.fn().mockResolvedValue('OK') };

      const claimed = await claimEvent(client as any, message);

      expect(claimed).toBe(true);
      expect(client.set).toHaveBeenCalledWith(expectedKey, '1', {
        NX: true,
        EX: 60,
      });
    });

    it('should not claim the event when another instance already locked it', async () => {
      const client = { set: jest.fn().mockResolvedValue(null) };

      const claimed = await claimEvent(client as any, message);

      expect(claimed).toBe(false);
    });

    it('should derive the same lock key for identical messages', async () => {
      const client = { set: jest.fn().mockResolvedValue('OK') };

      await claimEvent(client as any, message);
      await claimEvent(client as any, message);

      expect(client.set).toHaveBeenNthCalledWith(1, expectedKey, '1', {
        NX: true,
        EX: 60,
      });
      expect(client.set).toHaveBeenNthCalledWith(2, expectedKey, '1', {
        NX: true,
        EX: 60,
      });
    });

    it('should process the event anyway if the lock cannot be acquired', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
      const client = { set: jest.fn().mockRejectedValue(new Error('down')) };

      const claimed = await claimEvent(client as any, message);

      expect(claimed).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('emailEventSubscriber', () => {
    it('should not subscribe when Redis is not configured', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();
      (getRedisClient as jest.Mock).mockResolvedValue(null);

      await emailEventSubscriber();

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis not configured')
      );
    });

    it('should subscribe to the configured email events channel', async () => {
      const subscriber = {
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockResolvedValue(undefined),
      };
      const client = {
        duplicate: jest.fn().mockReturnValue(subscriber),
        set: jest.fn().mockResolvedValue('OK'),
      };
      (getRedisClient as jest.Mock).mockResolvedValue(client);

      await emailEventSubscriber();

      expect(subscriber.connect).toHaveBeenCalled();
      expect(subscriber.subscribe).toHaveBeenCalledWith(
        'email-events',
        expect.any(Function)
      );
    });

    it('should claim then handle a received message, and skip duplicates', async () => {
      const user = await User.create({
        username: 'recipient@who.int',
        name: 'Recipient',
      });
      const subscriber = {
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockResolvedValue(undefined),
      };
      // First claim wins ('OK'), second is a duplicate (null).
      const client = {
        duplicate: jest.fn().mockReturnValue(subscriber),
        set: jest
          .fn()
          .mockResolvedValueOnce('OK')
          .mockResolvedValueOnce(null),
      };
      (getRedisClient as jest.Mock).mockResolvedValue(client);

      await emailEventSubscriber();
      const handler = subscriber.subscribe.mock.calls[0][1];
      const message = JSON.stringify({
        subject: 'Hi',
        html: '<p>x</p>',
        emails: ['recipient@who.int'],
      });

      // First delivery is processed.
      await handler(message);
      expect(await Notification.countDocuments()).toBe(1);
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({ notification: expect.any(Object) })
      );

      // Second delivery of the same event is de-duplicated.
      await handler(message);
      expect(await Notification.countDocuments()).toBe(1);
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });

    it('should log and swallow errors thrown while handling a message', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();
      const subscriber = {
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockResolvedValue(undefined),
      };
      const client = {
        duplicate: jest.fn().mockReturnValue(subscriber),
        set: jest.fn().mockResolvedValue('OK'),
      };
      (getRedisClient as jest.Mock).mockResolvedValue(client);

      await emailEventSubscriber();
      const handler = subscriber.subscribe.mock.calls[0][1];

      await expect(handler('not-json')).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle email event'),
        expect.any(Object)
      );
    });
  });
});
