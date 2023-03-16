import mongoose from 'mongoose';
import { Form, Resource, User } from '@models';
import getFilter from '../schema/resolvers/Query/getFilter';

/**
 * Creates a Mongo filter for a specific permission on a form, for an user.
 *
 * @param user user to get permission for
 * @param object object (form / resource) to get permission on
 * @param permission name of the permission to get filter for
 * @returns Mongo permission filter.
 */
export const getFormPermissionFilter = (
  user: User,
  object: Form | Resource,
  permission: string
): any[] => {
  const roles = user.roles.map((x) => mongoose.Types.ObjectId(x._id));
  const permissionFilters = [];
  const permissionArray = object.permissions[permission];
  if (permissionArray && permissionArray.length) {
    permissionArray.forEach((x) => {
      if (!x.role || roles.some((role) => role.equals(x.role))) {
        const filter = {};
        Object.assign(
          filter,
          x.access && getFilter(x.access, object.fields, { user })
        );
        permissionFilters.push(filter);
      }
    });
  }
  return permissionFilters;
};
