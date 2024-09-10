import { authType } from '@const/enumTypes';
import { ApiConfiguration, Group } from '@models';
import { getToken } from '../proxy';
import jsonpath from 'jsonpath';
import fetch from 'node-fetch';
import config from 'config';
import { GroupListSettings } from './userManagement';
import { logger } from '@lib/logger';

/**
 * Fetches groups from external API and returns them.
 *
 * @returns data from service
 */
export const fetchGroups = async () => {
  const {
    apiConfiguration: apiConfigurationID,
    endpoint,
    path,
    id,
    title,
    description,
  } = config.get('user.groups.list') as GroupListSettings;

  const apiConfiguration = await ApiConfiguration.findById(apiConfigurationID);
  let data: any;

  // Switch on authTypes supported for fetchGroups
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
  } else if (apiConfiguration.authType === authType.public) {
    const res = await fetch(apiConfiguration.endpoint + endpoint, {
      method: 'get',
    });
    data = await res.json();
  } else {
    logger.error(
      'Failure when fetching groups because of an unsupported API configuration type.'
    );
    // Throwing an error here so above function can catch and throw GraphQL error.
    throw new Error();
  }
  const rawGroups = jsonpath.query(data, path);
  const groups: Group[] = rawGroups.map(
    (group: any) =>
      new Group({
        oid: jsonpath.value(group, id) || null,
        title: jsonpath.value(group, title) || null,
        description: jsonpath.value(group, description) || null,
      })
  );

  return groups;
};
