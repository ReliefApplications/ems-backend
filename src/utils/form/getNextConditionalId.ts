import { Record } from '@models';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import Redis from 'ioredis';
import config from 'config';
import i18next from 'i18next';

/** Redis caching initialization, dedicated to conditional ids (kept separate from getNextId's cache) */
const nextConditionalIdCache = new BaseRedisCache({
  client: new Redis(config.get('redis.url'), {
    password: config.get('redis.password'),
    showFriendlyErrorStack: true,
    lazyConnect: true,
    maxRetriesPerRequest: 5,
  }),
});

/**
 * Builds the Redis cache key for a conditional id counter.
 * Namespaced by structure + field + prefix so that a single field can hold
 * two independent counters (one per boolean branch) without colliding with
 * each other or with the unrelated incrementalId counter.
 *
 * @param structureId Id of the form / resource.
 * @param fieldName Name of the conditional id field.
 * @param prefix Prefix for the current boolean branch (e.g. 'UA', 'NC', 'C', 'M').
 * @returns Redis cache key.
 */
const getCacheKey = (
  structureId: string,
  fieldName: string,
  prefix: string
): string => `${structureId}:${fieldName}:${prefix}`;

/**
 * Gets the next value for a conditional id field (a field whose generated
 * value depends on a sibling boolean field, e.g. cecis_number / MedEvac case id).
 * Unlike getNextId, there is no year-based reset: these formats have no date component.
 *
 * @param structureId Id of the form / resource.
 * @param fieldName Name of the conditional id field, as stored in record.data.
 * @param prefix Prefix for the current boolean branch (e.g. 'UA', 'NC', 'C', 'M').
 * @param digits Number of digits to zero-pad the incremental number to.
 * @returns New value for the field (prefix + zero-padded number).
 */
export const getNextConditionalId = async (
  structureId: string,
  fieldName: string,
  prefix: string,
  digits: number
): Promise<string> => {
  const cacheKey = getCacheKey(structureId, fieldName, prefix);
  // Get previous value from Redis cache
  let previousValue: string = await nextConditionalIdCache.get(cacheKey);
  // If not cached, get it from the DB
  if (!previousValue) {
    const dataFieldPath = `data.${fieldName}`;
    const lastRecord = await Record.findOne(
      {
        $or: [{ resource: structureId }, { form: structureId }],
        [dataFieldPath]: { $regex: `^${prefix}` },
      },
      dataFieldPath
    )
      .sort({ [dataFieldPath]: -1 })
      .limit(1);
    previousValue = lastRecord
      ? lastRecord.get(dataFieldPath)
      : `${prefix}${String(0).padStart(digits, '0')}`;
  }
  if (!previousValue) {
    throw new Error(
      i18next.t('utils.form.getNextConditionalId.errors.conditionalIdError')
    );
  }
  // Increment the number, keep the prefix, re-pad to the configured digit count
  const previousNumber = Number(previousValue.substring(prefix.length));
  const nextValue = `${prefix}${String(previousNumber + 1).padStart(
    digits,
    '0'
  )}`;
  await nextConditionalIdCache.set(cacheKey, nextValue);
  return nextValue;
};
