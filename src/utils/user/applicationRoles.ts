import { Permission, Role } from '@models';
import { Types } from 'mongoose';
import { uniq } from 'lodash';

/**
 * Check that every given role belongs to the given application.
 *
 * Application user managers may only grant roles of the application they manage:
 * accepting any role id would let them attach a back-office (global) role,
 * or a role of another application, to any user, including themselves.
 *
 * @param roleIds role ids to check
 * @param applicationId application the roles must belong to
 * @returns true when every role exists and is attached to the application
 */
export const rolesBelongToApplication = async (
  roleIds: (string | Types.ObjectId)[],
  applicationId: string | Types.ObjectId
): Promise<boolean> => {
  const ids = uniq((roleIds || []).map((x) => x.toString()));
  if (ids.length === 0) {
    return true;
  }
  const roles = await Role.find({
    _id: { $in: ids },
    application: applicationId,
  }).select('_id');
  return roles.length === ids.length;
};

/**
 * Check that every given permission is an application permission (not a back-office one).
 *
 * Application role managers may only put application permissions on their roles:
 * a back-office (global) permission on an application role would be counted as a
 * global permission for everyone holding the role.
 *
 * @param permissionIds permission ids to check
 * @returns true when every permission exists and is not global
 */
export const permissionsAreApplicationScoped = async (
  permissionIds: (string | Types.ObjectId)[]
): Promise<boolean> => {
  const ids = uniq((permissionIds || []).map((x) => x.toString()));
  if (ids.length === 0) {
    return true;
  }
  const count = await Permission.countDocuments({
    _id: { $in: ids },
    global: { $ne: true },
  });
  return count === ids.length;
};
