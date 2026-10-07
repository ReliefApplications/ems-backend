import { User } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import NodeCache from 'node-cache';
import { AppAbility } from '@security/defineUserAbility';
import { set } from 'lodash';

/** Ability Cache, based on user id, time to live: 5min */
const abilityCache = new NodeCache({ stdTTL: 60 * 5, checkperiod: 60 });

/**
 * Gets the user ability on records of all forms, from cache if available,
 * and sets it on the context user.
 *
 * @param user Logged user
 * @param context GraphQL context
 * @returns The user ability on records
 */
export default async (user: User, context: any): Promise<AppAbility> => {
  const userId = user._id.toString();
  // Try to get ability from cache
  let ability = abilityCache.get<AppAbility>(userId);
  if (!ability) {
    // If not available, build ability
    ability = await extendAbilityForRecords(user);
    // And cache it
    abilityCache.set(userId, ability);
  }
  // Update user ability
  set(context, 'user.ability', ability);
  return ability;
};
