import { authType } from '@const/enumTypes';
import { ApiConfiguration, Group } from '@models';
import { getToken } from '../proxy';
import { JSONPath } from 'jsonpath-plus';
import config from 'config';
import { GroupListSettings } from './userManagement';
import { logger } from '@services/logger.service';
import axios from 'axios';

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

  if (!apiConfiguration) {
    logger.error('API Configuration does not exist');
    // Throwing an error here so above function can catch and throw GraphQL error.
    throw new Error();
  }

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
    const res = await axios({
      url: apiConfiguration.endpoint + endpoint,
      method: 'get',
      headers,
    });
    data = res.data;
  } else if (apiConfiguration.authType === authType.public) {
    const res = await axios({
      url: apiConfiguration.endpoint + endpoint,
      method: 'get',
    });
    data = res.data;
  } else {
    logger.error(
      'Failure when fetching groups because of an unsupported API configuration type.'
    );
    // Throwing an error here so above function can catch and throw GraphQL error.
    throw new Error();
  }
  const rawGroups = JSONPath({ path, json: data, wrap: true });
  const groups: Group[] = rawGroups.map(
    (group: any) =>
      new Group({
        oid: JSONPath({ path: id, json: group, wrap: false }) || null,
        title: JSONPath({ path: title, json: group, wrap: false }) || null,
        description:
          JSONPath({ path: description, json: group, wrap: false }) || null,
      })
  );

  return groups;
};
