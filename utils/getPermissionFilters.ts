import  mongoose  from 'mongoose';
import { Form, Record, User } from '../models';
import convertFilter from './convertFilter';

function getPermissionFilters(user: User, form: Form, field: string): any[] {
    const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));
    const permissionFilters = [];
    form.permissions[field].forEach(x => {
        if (!x.role || roles.some(role => role.equals(x.role))) {
            const filter = {};
            Object.assign(filter,
                x.access && convertFilter(x.access, Record, user)
            );
            permissionFilters.push(filter);
        }
    });
    return permissionFilters;
}

export default getPermissionFilters