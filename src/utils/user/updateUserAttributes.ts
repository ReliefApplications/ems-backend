import config from 'config';
import i18next from 'i18next';
import jsonpath from 'jsonpath';
import { isEmpty, set } from 'lodash';
import { authType } from '@const/enumTypes';
import { ApiConfiguration, User } from '@models';
import { logger } from '@services/logger.service';
import { getDelegatedToken } from '../proxy';
import { AttributeSettings } from './userManagement';
import axios from 'axios';

/**
 * Check if we need to update user attributes and perform it when needed.
 *
 * @param user Logged user to update.
 * @param req Original req.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUserAttributes = async (
  user: User,
  req: any
): Promise<boolean> => {
  try {
    // Get settings
    const settings: AttributeSettings = config.get('user.attributes');
    // Check if we have correct settings to update user attributes from external system
    if (settings.local) return false;
    if (
      !settings.apiConfiguration ||
      !settings.endpoint ||
      !settings.mapping ||
      isEmpty(settings.mapping)
    ) {
      logger.error(
        i18next.t(
          'utils.user.updateUserAttributes.errors.missingObjectParameters',
          {
            object: 'user attributes settings',
          }
        )
      );
      return false;
    }
    // Get delegated token
    const upstreamToken = req.headers.authorization.split(' ')[1];
    let token: string;
    const apiConfiguration = await ApiConfiguration.findById(
      settings.apiConfiguration
    );
    if (apiConfiguration) {
      if (apiConfiguration.authType === authType.serviceToService) {
        token = await getDelegatedToken(
          apiConfiguration,
          user._id,
          upstreamToken
        );
      }
      // Pass it in headers
      const headers: any = token
        ? {
            Authorization: 'Bearer ' + token,
          }
        : {};
      // Fetch new attributes
      let res;
      let data;
      try {
        res = await axios({
          url: apiConfiguration.endpoint + settings.endpoint,
          method: 'get',
          headers,
        });
        data = res.data;
      } catch (err) {
        logger.error(i18next.t('common.errors.invalidAPI'), {
          stack: err.stack,
        });
        return false;
      }
      // Map them to user attributes
      for (const mapping of settings.mapping) {
        if (mapping.provider !== 'microsoftGraph') {
          const value = jsonpath.value(data, mapping.value);
          set(user, mapping.field, value);
        }
      }
      user.markModified('attributes');
      return settings.mapping.length > 0;
    } else {
      // Api configuration does not exist
      return false;
    }
  } catch {
    logger.error('Fail to update user attributes');
    return false;
  }
};
