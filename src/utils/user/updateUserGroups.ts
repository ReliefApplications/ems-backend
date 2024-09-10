import jsonpath from 'jsonpath';
import fetch from 'node-fetch';
import config from 'config';
import i18next from 'i18next';
import logger from '@lib/logger';
import { authType } from '@const/enumTypes';
import { ApiConfiguration, Group, User } from '@models';
import { getDelegatedToken } from '../proxy';
import { isEmpty } from 'lodash';
import { GroupSettings } from './userManagement';

/**
 * Check if we need to update user groups and perform it when needed.
 *
 * @param user the current user.
 * @param req Original req.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUserGroups = async (
  user: User,
  req: any
): Promise<boolean> => {
  try {
    // Get settings
    const groupSettings: GroupSettings = config.get('user.groups');
    // Check if we have correct settings to update user attributes from external system
    if (groupSettings.local) return false;
    const settings = groupSettings.user;
    if (
      !settings ||
      !settings.apiConfiguration ||
      !settings.endpoint ||
      !settings.path ||
      !settings.id
    ) {
      logger.error(
        i18next.t('common.errors.missingObjectParameters', {
          object: 'user groups settings',
        })
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
      try {
        res = await fetch(apiConfiguration.endpoint + settings.endpoint, {
          method: 'get',
          headers,
        });
      } catch (err) {
        logger.error(i18next.t('common.errors.invalidAPI'), {
          stack: err.stack,
        });
        return false;
      }
      let data: any;
      try {
        data = await res.json();
      } catch (err) {
        logger.error(i18next.t('common.errors.authenticationTokenNotFound'), {
          stack: err.stack,
        });
        return false;
      }

      // Extract groups from data
      if (!data || isEmpty(data)) return false;
      const rawGroups = jsonpath.query(data, settings.path);
      if (!rawGroups || !rawGroups.length) return false;
      const groupsOids = rawGroups.map((group: any) =>
        jsonpath.value(group, settings.id)
      );
      const groups: Group[] = await Group.find(
        { oid: { $in: groupsOids } },
        '_id'
      );

      // Update user if needed
      if (groups.length > 0) {
        user.groups = groups.map((g) => g._id);
        user.markModified('groups');
        return true;
      }
      return false;
    } else {
      // Api configuration does not exist
      return false;
    }
  } catch {
    logger.error('Fail to update user attributes');
    return false;
  }
};
