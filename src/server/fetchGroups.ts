import { authType } from '../const/enumTypes';
import { ApiConfiguration, Group, User } from '../models';
import { getToken } from '../utils/proxy';
import jsonpath from 'jsonpath';
import fetch from 'node-fetch';
import config from 'config';
import get from 'lodash/get';

/**
 * Fetches groups from external API and returns them.
 *
 * @returns data from service
 */
export const fetchGroupsFromService = async () => {
  const {
    apiConfiguration: apiConfigurationID,
    groups: { endpoint, path, idField, titleField, descriptionField },
  } = config.get('groups.fromService');

  const apiConfiguration = await ApiConfiguration.findById(apiConfigurationID);
  let data: any;

  // Switch on all available authTypes
  if (
    apiConfiguration.authType === authType.serviceToService ||
    apiConfiguration.authType === authType.userToService
  ) {
    const token: string = await getToken(apiConfiguration);
    const headers: any = {
      Authorization: 'Bearer ' + token,
    };
    const res = await fetch(apiConfiguration.endpoint + endpoint, {
      method: 'get',
      headers,
    });
    data = await res.json();
  }

  if (apiConfiguration.authType === authType.public) {
    const res = await fetch(apiConfiguration.endpoint + endpoint, {
      method: 'get',
    });
    data = await res.json();
  }

  const rawGroups = jsonpath.query(data, path);
  const groups: Group[] = rawGroups.map(
    (group: any) =>
      new Group({
        oid: get(group, idField, null),
        title: get(group, titleField, null),
        description: get(group, descriptionField, null),
      })
  );

  return groups;
};

/**
 * Fetches the groups of an user from service
 * and updates the user's groups in the database
 *
 * @param user the current user
 */
export const fetchUserGroupsFromService = async (user: User) => {
  const userOid = user.oid;
  const {
    apiConfiguration: apiConfigurationID,
    userGroups: { endpoint, path, idField },
  } = config.get('groups.fromService');

  const apiConfiguration = await ApiConfiguration.findById(apiConfigurationID);
  let data: any;

  // Switch on all available authTypes
  if (
    apiConfiguration.authType === authType.serviceToService ||
    apiConfiguration.authType === authType.userToService
  ) {
    const token: string = await getToken(apiConfiguration);
    const headers: any = {
      Authorization: 'Bearer ' + token,
    };
    const res = await fetch(
      apiConfiguration.endpoint + endpoint.replace('{id}', userOid),
      {
        method: 'get',
        headers,
      }
    );
    data = await res.json();
  }

  if (apiConfiguration.authType === authType.public) {
    const res = await fetch(
      apiConfiguration.endpoint + endpoint.replace('{id}', userOid),
      {
        method: 'get',
      }
    );
    data = await res.json();
  }

  const rawGroups = jsonpath.query(data, path);
  const groupsOids = rawGroups.map((group: any) => group[idField]);

  const groups: Group[] = await Group.find({ oid: { $in: groupsOids } });

  await User.findByIdAndUpdate(user._id, {
    $set: { groups: groups.map((g) => g._id) },
  });
};
