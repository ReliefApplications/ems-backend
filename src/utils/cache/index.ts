import { BaseRedisCache } from 'apollo-server-cache-redis';
import Redis from 'ioredis';
import config from 'config';

/**
 * Shared Redis primitives reused across the app.
 *
 * Before this module, three places (`server/apollo/dataSources.ts`,
 * `utils/form/getNextId.ts`, `utils/schema/resolvers/Query/all.ts`) each
 * instantiated their own `ioredis` client + `BaseRedisCache`. This module
 * centralizes that and exposes:
 *
 * - `getRedisClient()` — the shared `ioredis` instance (lazy connected).
 * - `getBaseCache()`   — the shared `BaseRedisCache` (apollo-server-cache-redis).
 * - `createCache(ns, ttl)` — a thin JSON-serializing wrapper with key
 *   namespacing and a default TTL, for typed perf caches.
 */

/** Shared `ioredis` client. */
let sharedClient: Redis | null = null;
/**
 * Returns the process-wide shared `ioredis` client (created lazily).
 *
 * @returns The shared `Redis` instance.
 */
export const getRedisClient = (): Redis => {
  if (!sharedClient) {
    sharedClient = new Redis(config.get<string>('redis.url'), {
      password: config.get<string>('redis.password'),
      showFriendlyErrorStack: true,
      lazyConnect: true,
      maxRetriesPerRequest: 5,
    });
  }
  return sharedClient;
};

/** Shared `BaseRedisCache` (string KV with TTL) used by Apollo + utilities. */
let sharedBase: BaseRedisCache | null = null;
/**
 * Returns the process-wide shared `BaseRedisCache` (created lazily) backed by
 * `getRedisClient()`. Suitable for raw string-value usage (Apollo, getNextId,
 * referenceData last-request).
 *
 * @returns The shared `BaseRedisCache` instance.
 */
export const getBaseCache = (): BaseRedisCache => {
  if (!sharedBase) {
    sharedBase = new BaseRedisCache({ client: getRedisClient() as any });
  }
  return sharedBase;
};

/**
 * Typed JSON-serializing cache built on top of `getBaseCache()`.
 *
 * Only plain JSON-serializable values should be stored. Class instances
 * (e.g. CASL `Ability`) must NOT be stored through this cache.
 */
export interface KVCache {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Create a namespaced cache with a default TTL.
 *
 * @param namespace Prefix prepended to every key (e.g. `permissionFilters`).
 * @param defaultTTL Default TTL in seconds when `set` is called without one.
 * @returns A `KVCache` that JSON-serializes values and namespaces keys.
 */
export const createCache = (namespace: string, defaultTTL: number): KVCache => {
  const base = getBaseCache();
  const ns = (k: string) => `${namespace}:${k}`;
  return {
    async get<T>(key: string) {
      const raw = await base.get(ns(key));
      if (raw === undefined || raw === null) {
        return undefined;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    async set(key, value, ttlSeconds) {
      await base.set(ns(key), JSON.stringify(value), {
        ttl: ttlSeconds ?? defaultTTL,
      });
    },
    async del(key) {
      await base.delete(ns(key));
    },
  };
};
