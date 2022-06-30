import { get, set } from 'lodash';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import { Setting, User } from '../../models';
import i18next from 'i18next';

/** Initialize cache for settings */
export const settingCache = new NodeCache({
  useClones: true,
  forceString: true,
});
/** Cache key */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SETTING_KEY = '1';

/**
 * Get setting function with caching functionality
 *
 * @returns Global setting of the application.
 */
export const getSetting = async (): Promise<Setting> => {
  const cachedSetting = settingCache.get(SETTING_KEY);
  if (!cachedSetting) {
    try {
      const setting = await Setting.findOne({});
      settingCache.set(SETTING_KEY, setting.toJSON());
      return setting;
    } catch (e) {
      return null;
    }
  }
  return cachedSetting as Setting;
};

/**
 * Check wether we should update the user attributes or not.
 *
 * @param setting Global setting of the platform.
 * @param user Logged user.
 * @returns Boolean.
 */
const userNeedsExternalAttributes = (setting: Setting, user: User): boolean => {
  return (
    setting &&
    setting.userManagement &&
    setting.userManagement.local === false &&
    (!setting.modifiedAt ||
      !user.modifiedAt ||
      setting.modifiedAt > user.modifiedAt)
  );
};

/**
 * Check if we need to update user external attributes and perform it when needed.
 *
 * @param setting Global setting of the platform.
 * @param user Logged user to update.
 * @param token Auth token to pass to service API.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUserAttributes = async (
  setting: Setting,
  user: User,
  token: string
): Promise<boolean> => {
  if (!userNeedsExternalAttributes(setting, user)) return false;
  let res;
  try {
    res = await fetch(setting.userManagement.serviceAPI, {
      method: 'get',
      headers: {
        Authorization: token,
      },
    });
  } catch (e) {
    console.log(i18next.t('errors.invalidAPI'));
    return false;
  }
  let json: any;
  try {
    json = await res.json();
  } catch (e) {
    console.log(i18next.t('errors.authenticationTokenNotFound'));
    return false;
  }
  for (const mapping of setting.userManagement.attributesMapping) {
    const attribute = get(json, mapping.path);
    const value = get(attribute, mapping.value);
    const text = get(attribute, mapping.text);
    set(user, mapping.field, { value, text });
  }
  user.markModified('externalAttributes');
  return setting.userManagement.attributesMapping.length > 0;
};
