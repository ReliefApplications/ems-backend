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
  // For the moment use custom token
  // token = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiI3NWRlY2EwNi1hZTA3LTQ3NjUtODVjMC0yM2U3MTkwNjI4MzMiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAvIiwiaWF0IjoxNjU2NDMxMjU4LCJuYmYiOjE2NTY0MzEyNTgsImV4cCI6MTY1NjQzNTk5NywiYWNyIjoiMSIsImFpbyI6IkFVUUF1LzhUQUFBQWZXYWttcUNFZkZEMnl0TWVKM3NYMUZvd1AwYmNkL2s5RFpEQlpGY2dCTjMvYlpyeFVPV2NkTkE4Yi9pbktHM1VmLytXZmRsemVIYXB4L1kwS0NoU0VRPT0iLCJhbXIiOlsicHdkIl0sImFwcGlkIjoiODc3ZGFmNWMtNjMyOS00NjEyLTkwMjYtYWJjZTA3YWU1ODk1IiwiYXBwaWRhY3IiOiIwIiwiZW1haWwiOiJwYWNvbWVAcmVsaWVmYXBwbGljYXRpb25zLm9yZyIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2ZiYWNkNDhkLWNjZjQtNDgwZC1iYWYwLTMxMDQ4MzY4MDU1Zi8iLCJpcGFkZHIiOiIxMDkuMTAuMTczLjIwIiwibmFtZSI6IlBhY29tZSBSaXZpZXJlIiwib2lkIjoiNTA4ODFmNmYtN2E4MC00ZWQ1LWFkYjctN2EzYTVjYjY5NTI2IiwicmgiOiIwLkFVY0F0OEFROWlTOU9VdUJDejNDZ0stMWtBYkszblVIcm1WSGhjQWo1eGtHS0ROSEFMOC4iLCJzY3AiOiJhY2Nlc3NfYXNfdXNlciIsInNpZCI6IjdkN2ExZjgwLTUwMmYtNGU0YS04YmU3LWRhZmU5NjUyZDFkOCIsInN1YiI6ImNYNTNEbkVkM25ob3pKMFp2T3NUTjlaVFZNamtGbmRyQlhzT2lzT0ZsZ28iLCJ0aWQiOiJmNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAiLCJ1bmlxdWVfbmFtZSI6InBhY29tZUByZWxpZWZhcHBsaWNhdGlvbnMub3JnIiwidXRpIjoiNGlGTWtzRVNoVUNoMDRva3gzazRBQSIsInZlciI6IjEuMCJ9.SOZ2GDVrvyPGk5SNhMQ5o_m48IYU3cdwM_4VBKFxG14LHBE0Ev-RxUtJ9w1nHN5bgtjRC1LXro0btbA3uE_EbYUTaPT3jzo0CCyCCVNlN8c3SEt9ByzuwCXIZiRfHJdJeuorTHvDSS_GpQPGTmeUx9YoH1le6MlVRaScezigPea85cqTXgyePPHz-mW11Uubf4qyzE9k2L26RZxTV7NR3F-UU_9fwF3aXfBFxUGMakGNIMm9pgR0zj0SxgYB1XN9hGEx_2njzQDeDjK-bxZ5LOMIwy_jprhTeeavQjeP0GIj-yPiu9UTkAITGWxuxZmqjlRQCczjP883tdHNGgNerQ';
  return false; // To comment
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
