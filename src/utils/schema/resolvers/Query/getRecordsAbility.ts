import { createHash } from 'crypto';
import { User } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import NodeCache from 'node-cache';
import { AppAbility } from '@security/defineUserAbility';
import { set } from 'lodash';

/**
 * Ability Cache, based on user id and permissions fingerprint, time to live: 5min.
 * Flushed when a form or a resource changes ( see listenToSchemaUpdateTriggers ).
 */
const abilityCache = new NodeCache({ stdTTL: 60 * 5, checkperiod: 60 });

/**
 * Gets the string id of a populated document or of a raw id.
 *
 * @param value document or id
 * @returns string id
 */
const toId = (value: any): string | undefined =>
  (value?._id ?? value)?.toString();

/**
 * Builds a fingerprint of what the records ability depends on, on the user
 * side: roles and their permissions, groups and attributes. The user is loaded
 * from the database on every request, so any change of these values gives a
 * new cache key and applies immediately.
 *
 * @param user Logged user
 * @returns Fingerprint of the user permissions
 */
const getUserFingerprint = (user: User): string =>
  createHash('sha1')
    .update(
      JSON.stringify({
        roles: (user.roles || []).map((role) => ({
          id: toId(role),
          permissions: (role?.permissions || []).map(toId),
        })),
        groups: (user.groups || []).map(toId),
        attributes: user.attributes ?? null,
        positionAttributes: (user.positionAttributes || []).map(
          (attribute) => ({
            value: attribute?.value,
            category: toId(attribute?.category),
          })
        ),
      })
    )
    .digest('hex');

/**
 * Empties the ability cache, so the next requests rebuild the abilities.
 * Forms and resources hold the records permissions, so any change of them
 * must invalidate the cached abilities.
 */
export const clearRecordsAbilityCache = (): void => {
  abilityCache.flushAll();
};

/**
 * Gets the user ability on records of all forms, from cache if available,
 * and sets it on the context user.
 *
 * @param user Logged user
 * @param context GraphQL context
 * @returns The user ability on records
 */
export default async (user: User, context: any): Promise<AppAbility> => {
  const cacheKey = `${user._id.toString()}:${getUserFingerprint(user)}`;
  // Try to get ability from cache
  let ability = abilityCache.get<AppAbility>(cacheKey);
  if (!ability) {
    // If not available, build ability
    ability = await extendAbilityForRecords(user);
    // And cache it
    abilityCache.set(cacheKey, ability);
  }
  // Update user ability
  set(context, 'user.ability', ability);
  return ability;
};
