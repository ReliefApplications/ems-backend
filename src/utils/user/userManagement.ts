import config from 'config';
import { get, set } from 'lodash';
import fetch from 'node-fetch';
import { User } from '../../models';
import i18next from 'i18next';
import { getDelegatedToken } from '../../utils/proxy';
import { logger } from '../../services/logger.service';

/** Interface for Mapping element. */
export interface Mapping {
  field: string;
  path: string;
  value: any;
  text: string;
}

/** Interface for Mapping array. */
export type Mappings = Array<Mapping>;

/** Interface for User Management */
export interface UserManagement {
  local: boolean;
  apiConfiguration: string;
  serviceAPI: string;
  attributesMapping: Mappings;
}

/**
 * Used to check wether we should update the user attributes or not.
 * We should update user attributes only if the config changed, meaning the whole server restarted.
 */
let attributesFetched = false;

/**
 * Check if we need to update user external attributes and perform it when needed.
 *
 * @param user Logged user to update.
 * @param req Original req.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUserAttributes = async (
  user: User,
  req: any
): Promise<boolean> => {
  // Check if we really need to fetch new ones
  if (attributesFetched) return false;
  attributesFetched = true;
  // Get settings
  const userManagement: UserManagement = config.get('userManagement');
  // Get delegated token
  const upstreamToken = req.headers.authorization.split(' ')[1];
  const token = await getDelegatedToken(
    userManagement.apiConfiguration,
    user.id,
    upstreamToken
  );
  let res;
  // Fetch new attributes
  try {
    res = await fetch(userManagement.serviceAPI, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    logger.error(i18next.t('errors.invalidAPI'));
    return false;
  }
  let json: any;
  try {
    json = await res.json();
  } catch (e) {
    logger.error(i18next.t('errors.authenticationTokenNotFound'));
    return false;
  }
  // Map them to user attributes
  for (const mapping of userManagement.attributesMapping) {
    const attribute = get(json, mapping.path);
    const value = get(attribute, mapping.value);
    const text = get(attribute, mapping.text);
    if (!mapping.field.includes('attributes') && !mapping.field.includes('.')) {
      set(user, mapping.field, value);
    } else {
      set(user, mapping.field, { value, text });
    }
  }
  user.markModified('attributes');
  return userManagement.attributesMapping.length > 0;
};
