import { clone, difference, eq, get, isEqual, set } from 'lodash';
import { Role, User, IUserMicrosoftGraph } from '@models';
import config from 'config';
import axios from 'axios';
import { logger } from '@services/logger.service';
import { AttributeSettings } from './userManagement';
import jsonpath from 'jsonpath';
import { filterOperator } from 'types';

/**
 * Generate a new access token for Microsoft graph, on behalf of the user.
 */
const getGraphAccessToken = async () => {
  const form = new FormData();
  const formAsJson = {
    grant_type: 'client_credentials',
    client_id: config.get<string>('microsoftGraph.clientId') || '',
    client_secret: config.get<string>('microsoftGraph.clientSecret') || '',
    scope: 'https://graph.microsoft.com/.default',
  };
  Object.entries(formAsJson).forEach(([key, value]) => {
    form.append(key, value);
  });

  return axios({
    url: config.get('microsoftGraph.tokenEndpoint'),
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    data: form,
  })
    .then(({ data }) => {
      return data.access_token as string;
    })
    .catch((err) => {
      logger.error(err.message, { stack: err.stack });
    });
};

/**
 * Get user graph info from token
 *
 * @param user current user
 */
const getUserGraphInfo = async (user: User) => {
  const graphToken = await getGraphAccessToken();
  const oid = user.oid;
  if (graphToken && oid) {
    // Select url to fetch specific user info
    const url = `https://graph.microsoft.com/v1.0/users/${oid}?$select=userType,department`;
    return axios({
      url,
      method: 'get',
      headers: {
        Authorization: `Bearer ${graphToken}`,
      },
    })
      .then(({ data }) => {
        return data as IUserMicrosoftGraph;
      })
      .catch((err) => {
        logger.error(err.message, { stack: err.stack });
      });
  }
};

/**
 * Check if assignment rule works with user parameters
 *
 * @param user User to check
 * @param filter assignment rule filter
 * @returns true if filter matches
 */
export const checkIfRoleIsAssigned = (user: User, filter: any): boolean => {
  const groupIds: string[] = get(user, 'groups', []);
  const userAttr: { [key: string]: string } = user.attributes ?? {};
  if (filter.logic) {
    // Composite filter descriptor
    switch (filter.logic) {
      case 'or': {
        return filter.filters.some((x) => checkIfRoleIsAssigned(user, x));
      }
      case 'and': {
        return filter.filters
          .map((x) => checkIfRoleIsAssigned(user, x))
          .every((x) => x === true);
      }
      default: {
        return false;
      }
    }
  }

  switch (filter.field) {
    case '{{groups}}': {
      // todo: check other versions of the code
      const value = (filter.value || []).filter((x) => x !== null);
      switch (filter.operator) {
        case filterOperator.EQUAL_TO: {
          return isEqual(
            groupIds.map((x) => x.toString()),
            value.map((x) => x.toString())
          );
        }
        case filterOperator.CONTAINS: {
          return (
            difference(
              value.map((x) => x.toString()),
              groupIds.map((x) => x.toString())
            ).length === 0
          );
        }
        default: {
          return false;
        }
      }
    }
    case '{{email}}': {
      const value = user.username || '';
      if (value) {
        switch (filter.operator) {
          case filterOperator.EQUAL_TO: {
            return eq(value, String(filter.value));
          }
          case filterOperator.NOT_EQUAL_TO: {
            return !eq(value, String(filter.value));
          }
          case filterOperator.CONTAINS: {
            const regex = new RegExp(filter.value, 'i');
            return regex.test(value);
          }
          case filterOperator.DOES_NOT_CONTAIN: {
            const regex = new RegExp(filter.value, 'i');
            return !regex.test(value);
          }
          case filterOperator.STARTS_WITH: {
            return value.startsWith(filter.value);
          }
          case filterOperator.ENDS_WITH: {
            return value.endsWith(filter.value);
          }
          default:
            return false;
        }
      } else {
        return false;
      }
    }
    case '{{userType}}': {
      const value = get(user, 'graphData.userType') || '';
      if (value) {
        switch (filter.operator) {
          case filterOperator.EQUAL_TO: {
            return eq(value, String(filter.value));
          }
          case filterOperator.NOT_EQUAL_TO: {
            return !eq(value, String(filter.value));
          }
        }
      } else {
        return false;
      }
    }
    default: {
      const attrs =
        (config.get('user.attributes.list') as {
          value: string;
          text: string;
        }[]) || [];

      const attributes = attrs.map((x) => ({
        ...x,
        field: `{{attributes.${x.value}}}`,
      }));

      const attribute = attributes.find((x) => x.field === filter.field);
      if (attribute) {
        switch (filter.operator) {
          case filterOperator.EQUAL_TO: {
            return isEqual(userAttr[attribute.value], filter.value);
          }
          default: {
            return false;
          }
        }
      }

      return false;
    }
  }
};

/**
 * Get list of auto assigned roles for user
 *
 * @param user user to check
 * @returns list of auto assigned roles
 */
export const getAutoAssignedRoles = async (user: User): Promise<Role[]> => {
  // First, try to get user info from Microsoft graph
  if (user.oid && config.get('user.useMicrosoftGraph')) {
    const graphData = await getUserGraphInfo(user);
    if (graphData) {
      user.graphData = graphData;
      const settings: AttributeSettings = config.get('user.attributes');
      if (settings.mapping) {
        const prevAttributes = clone(get(user, 'attributes'));
        // Map them to user attributes
        for (const mapping of settings.mapping) {
          if (mapping.provider === 'microsoftGraph') {
            const value = jsonpath.value(graphData, mapping.value);
            set(user, mapping.field, value);
          }
        }
        // Compare attributes with previous ones, and save user if needed
        if (!isEqual(prevAttributes, user.attributes)) {
          user.markModified('attributes');
          await user.save();
        }
      }
    }
  }
  // Check all roles with auto assignment rules set
  const roles = await Role.find({
    autoAssignment: { $exists: true, $ne: [] },
  }).populate({
    path: 'permissions',
    model: 'Permission',
  });
  return roles.reduce((arr, role) => {
    if (role.autoAssignment.some((x) => checkIfRoleIsAssigned(user, x))) {
      arr.push(role);
    }
    return arr;
  }, []);
};

/**
 * Get list of auto assigned user
 *
 * @param user user to check
 * @param role role to check
 * @returns list of auto assigned roles
 */
export const checkIfRoleIsAssignedToUser = (
  user: User,
  role: Role
): boolean => {
  return role.autoAssignment.some((x) => checkIfRoleIsAssigned(user, x));
};
