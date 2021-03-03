// import applyFilters from './applyFilters';

import { GraphQLError } from "graphql";
import errors from "../../../const/errors";
import { Form, Record, User } from "../../../models";
import convertFilter from "../../convertFilter";
import getFilter from "./getFilter";
import getSortField from "./getSortField";
import mongoose from 'mongoose';

export default (id) => async (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {

    const user: User = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }

    const mongooseFilter = getFilter(filter);

    Object.assign(mongooseFilter,
        { $or: [{ resource: id }, { form: id }] }
    );

    const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] });

    const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));

    const permissionFilters = [];

    form.permissions.canQuery.forEach(x => {
        if ( !x.role || roles.some(role => role.equals(x.role))) {
            const permissionFilter = {};
            Object.assign(permissionFilter,
                x.access && convertFilter(x.access, Record, user)
            );
            permissionFilters.push(permissionFilter);
        }
    });

    return Record.find(
            permissionFilters.length > 0 ? { $and: [mongooseFilter, { $or: permissionFilters }] } :
            mongooseFilter
        )
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage);
};