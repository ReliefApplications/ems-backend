import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Form, Record, User } from '../../../../models';
import getFilter from './getFilter';
import getSortField from './getSortField';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';

export default (id, data) => (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {
    // Handle user access
    const user: User = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    
    // Filter from the query definition
    const mongooseFilter = getFilter(filter, data);
    Object.assign(mongooseFilter,
        { $or: [{ resource: id }, { form: id }] },
        { archived: { $ne: true } }
    );
    
    // Resolver for the records
    const resultResolver = {
        result: async () => {
            // Filter from the user permissions
            let permissionFilters = [];
            if (ability.cannot('read', 'Record')) {
                const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions');
                permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
                if (permissionFilters.length > 0) {
                    return Record
                    .find({ $and: [mongooseFilter, { $or: permissionFilters }] })
                    .sort([[getSortField(sortField), sortOrder]])
                    .skip(page * perPage)
                    .limit(perPage);
                } else {
                    // If permissions are set up and no one match our role return null
                    if (form.permissions.canSeeRecords.length > 0) {
                        return null;
                    }
                }
            }
            return Record
                .find(mongooseFilter)
                .sort([[getSortField(sortField), sortOrder]])
                .skip(page * perPage)
                .limit(perPage);
        }
    }

    // Resolver for the counting of the records
    const countResolver = {
        count: async () => {
            // Filter from the user permissions
            let permissionFilters = [];
            if (ability.cannot('read', 'Record')) {
                const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions');
                permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
                if (permissionFilters.length > 0) {
                    return Record
                    .find({ $and: [mongooseFilter, { $or: permissionFilters }] })
                    .count();
                } else {
                    // If permissions are set up and no one match our role return 0
                    if (form.permissions.canSeeRecords.length > 0) {
                        return 0;
                    }
                }
            }
            return Record
                .find(mongooseFilter)
                .count();
        }
    }
    return Object.assign({}, resultResolver, countResolver);
};
