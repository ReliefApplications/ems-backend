import Redis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import config from 'config';
import { logger } from '@services/logger.service';
import getPubSub from '@server/pubsub';

jest.mock('@services/logger.service');
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));
jest.mock('graphql-redis-subscriptions', () => ({
  RedisPubSub: jest.fn().mockImplementation(() => ({ name: 'pubsub-instance' })),
}));
jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      switch (setting) {
        case 'redis.url':
          return 'redis://localhost:6379';
        case 'redis.password':
          return 'mockPassword';
        default:
          return undefined;
      }
    }),
    util: {
      getEnv: jest.fn((settings: string) =>
        settings ? 'development' : 'production'
      ),
    },
  };
});

describe('pubsub', () => {
  // Note: the module memoizes the pubsub instance, so these tests intentionally
  // run in order and share that single construction (no clearAllMocks).
  it('should create a RedisPubSub backed by two redis clients', async () => {
    const result = await getPubSub();

    expect(Redis).toHaveBeenCalledTimes(2);
    expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', {
      password: 'mockPassword',
      showFriendlyErrorStack: true,
      lazyConnect: true,
      maxRetriesPerRequest: 5,
    });
    expect(RedisPubSub).toHaveBeenCalledTimes(1);
    expect(RedisPubSub).toHaveBeenCalledWith({
      publisher: expect.any(Object),
      subscriber: expect.any(Object),
    });
    expect(result).toEqual({ name: 'pubsub-instance' });
  });

  it('should register redis lifecycle listeners that log their events', () => {
    const clientInstance = (Redis as unknown as jest.Mock).mock.results[0]
      .value;
    const handlers: Record<string, (arg?: any) => void> = {};
    (clientInstance.on as jest.Mock).mock.calls.forEach(
      ([event, handler]: [string, (arg?: any) => void]) => {
        handlers[event] = handler;
      }
    );

    handlers.connect();
    expect(logger.info).toHaveBeenCalledWith('Connected to redis instance');

    handlers.ready();
    expect(logger.info).toHaveBeenCalledWith('Redis instance is ready');

    handlers.disconnect();
    expect(logger.info).toHaveBeenCalledWith('Disconnected from redis instance');

    handlers.error(new Error('boom'));
    expect(logger.error).toHaveBeenCalledWith(
      'Error connecting to redis: "Error: boom"'
    );
  });

  it('should memoize the pubsub instance across calls', async () => {
    const first = await getPubSub();
    const second = await getPubSub();

    expect(first).toBe(second);
    // Still only constructed once (and only the two clients from the first call).
    expect(RedisPubSub).toHaveBeenCalledTimes(1);
    expect(Redis).toHaveBeenCalledTimes(2);
  });
});
