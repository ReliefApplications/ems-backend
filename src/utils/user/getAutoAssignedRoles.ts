import { difference, get, isEqual } from 'lodash';
import { Role, User } from '@models';
import config from 'config';

/**
 * Check if assignment rule works with user parameters
 *
 * @param filter assignment rule filter
 * @param groupIds list of group ids
 * @param userAttr object of user attributes
 * @returns true if filter matches
 */
export const checkIfRoleIsAssigned = (
  filter: any,
  groupIds: string[],
  userAttr: { [key: string]: string }
): boolean => {
  if (filter.logic) {
    // Composite filter descriptor
    switch (filter.logic) {
      case 'or': {
        return filter.filters.some((x) =>
          checkIfRoleIsAssigned(x, groupIds, userAttr)
        );
      }
      case 'and': {
        return filter.filters
          .map((x) => checkIfRoleIsAssigned(x, groupIds, userAttr))
          .every((x) => x === true);
      }
      default: {
        return false;
      }
    }
  }

  // filter descriptor
  if (filter.field === '{{groups}}') {
    const value = filter.value.filter((x) => x !== null);
    switch (filter.operator) {
      case 'eq': {
        return isEqual(
          groupIds.map((x) => x.toString()),
          value.map((x) => x.toString())
        );
      }
      case 'contains': {
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
      case 'eq': {
        return isEqual(userAttr[attribute.value], filter.value);
      }
      default: {
        return false;
      }
    }
  }

  return false;
};

/**
 * Get list of auto assigned roles for user
 *
 * @param user user to check
 * @returns list of auto assigned roles
 */
export const getAutoAssignedRoles = async (user: User): Promise<Role[]> => {
  const roles = await Role.find({
    autoAssignment: { $exists: true, $ne: [] },
  }).populate({
    path: 'permissions',
    model: 'Permission',
  });
  return roles.reduce((arr, role) => {
    if (
      role.autoAssignment.some((x) =>
        checkIfRoleIsAssigned(x, get(user, 'groups', []), user.attributes ?? {})
      )
    ) {
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
  return role.autoAssignment.some((x) =>
    checkIfRoleIsAssigned(x, get(user, 'groups', []), user.attributes ?? {})
  );
};
