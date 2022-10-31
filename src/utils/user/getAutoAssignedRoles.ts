import { difference, get, isEqual } from 'lodash';
import { Role, User } from '../../models';

/**
 * Check if assignment rule works with user parameters
 *
 * @param groupIds list of group ids
 * @param filter assignment rule filter
 * @returns true if filter matches
 */
export const checkIfRoleIsAssigned = (
  groupIds: string[],
  filter: any
): boolean => {
  if (filter.logic) {
    // Composite filter descriptor
    switch (filter.logic) {
      case 'or': {
        return filter.filters.some((x) => checkIfRoleIsAssigned(groupIds, x));
      }
      case 'and': {
        return filter.filters
          .map((x) => checkIfRoleIsAssigned(groupIds, x))
          .every((x) => x === true);
      }
      default: {
        return false;
      }
    }
  } else {
    // filter descriptor
    switch (filter.field) {
      case '{{groups}}': {
        switch (filter.operator) {
          case 'eq': {
            return isEqual(groupIds, filter.value);
          }
          case 'contains': {
            return difference(filter.value, groupIds).length === 0;
          }
          default: {
            return false;
          }
        }
      }
      default: {
        return false;
      }
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
  const roles = await Role.find({
    autoAssignment: { $exists: true, $ne: [] },
  }).populate({
    path: 'permissions',
    model: 'Permission',
  });
  const groupIds = user.groups.map((x) => String(get(x, 'id', x)));
  return roles.reduce((arr, role) => {
    if (role.autoAssignment.some((x) => checkIfRoleIsAssigned(groupIds, x))) {
      arr.push(role);
    }
    return arr;
  }, []);
};
