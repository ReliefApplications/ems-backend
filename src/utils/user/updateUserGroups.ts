import jsonpath from 'jsonpath';
import config from 'config';
import i18next from 'i18next';
import { logger } from '../../services/logger.service';
import { authType } from '@const/enumTypes';
import { ApiConfiguration, Group, User } from '@models';
import { getDelegatedToken } from '../proxy';
import { isEmpty, isEqual } from 'lodash';
import { GroupSettings } from './userManagement';
import axios from 'axios';

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

      // Check if data exists
      if (!data || isEmpty(data)) {
        // If no data, update user if needed
        if (!isEqual(user.groups, [])) {
          user.groups = [];
          user.markModified('groups');
          return true;
        } else {
          return false;
        }
      }

      // Extract groups from response
      const rawGroups = jsonpath.query(data, settings.path) || [];
      const groupsOids = rawGroups.map((group: any) =>
        jsonpath.value(group, settings.id)
      );

      // Find groups
      const groups: Group[] = await Group.find(
        { oid: { $in: groupsOids } },
        '_id'
      );

      // Compare current & new user groups
      const newGroupIds = groups.map((g) => g._id.toString());
      const currentGroupIds = (user.groups || []).map((id) => id.toString());
      if (!isEqual(newGroupIds.sort(), currentGroupIds.sort())) {
        user.groups = groups.map((g) => g._id);
        user.markModified('groups');
        return true;
      } else {
        return false;
      }
    } else {
      // if no api configuration, update user if needed
      if (!isEqual(user.groups, [])) {
        user.groups = [];
        user.markModified('groups');
        return true;
      } else {
        return false;
      }
    }
  } catch {
    logger.error('Fail to update user attributes');
    return false;
  }
};
