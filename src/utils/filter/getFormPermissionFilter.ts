import  mongoose  from 'mongoose';
import { Form, Record, User } from '../../models';
import { getRecordAccessFilter } from './getRecordAccessFilter';

/**
 * Creates a Mongo filter for a specific permission on a form, for an user.
 * @param user user to get permission for
 * @param form form object to get permission on
 * @param permission name of the permission to get filter for
 * @returns 
 */
export const getFormPermissionFilter = (user: User, form: Form, permission: string): any[] => {
  const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));
  const permissionFilters = [];
  form.permissions[permission].forEach(x => {
    if (!x.role || roles.some(role => role.equals(x.role))) {
      const filter = {};
      Object.assign(filter,
        x.access && getRecordAccessFilter(x.access, Record, user),
      );
      permissionFilters.push(filter);
    }
  });
  return permissionFilters;
};
