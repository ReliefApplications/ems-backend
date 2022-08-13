import { authType } from '../const/enumTypes';
import { ApiConfiguration, Group, User } from '../models';
import { getToken } from '../utils/proxy';
import jsonpath from 'jsonpath';
import fetch from 'node-fetch';
import config from 'config';
import { isValidObjectId } from 'mongoose';
import { cloneDeep, isArray } from 'lodash';

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
        oid: group[idField],
        title: group[titleField],
        description: group[descriptionField],
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

/**
 * Fetches the attributes of an user from service
 * and updates the values in the database
 *
 * @param user the current user
 */
export const fetchUserAttributesFromService = async (user: User) => {
  const userOid = user.oid;
  const {
    apiConfiguration: apiConfigurationID,
    attributes: { endpoint, attributes },
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

  const newAttributes = cloneDeep(user.positionAttributes);
  for (const attribute of attributes) {
    let val: string | string[] = jsonpath.query(data, attribute.valuePath);
    val = isArray(val) ? val[0] : val;
    if (!val) continue;
    const posAttr = newAttributes.find((x) => {
      if (isValidObjectId(attribute.category))
        return x.category._id.equals(attribute.category);
      return x.category.title === attribute.category;
    });
    if (posAttr) posAttr.value = val;
  }
  await User.findByIdAndUpdate(user._id, {
    $set: {
      positionAttributes: newAttributes.map((x) => ({
        ...x,
        category: x.category._id,
      })),
    },
  });
};
