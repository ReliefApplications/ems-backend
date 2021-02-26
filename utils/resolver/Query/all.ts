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

    // if (!ability.can('read', 'Record')) {
    //     form.permissions.canQuery.forEach(x => {
    //         Object.assign(mongooseFilter,
    //             convertFilter(x.access, Record, user)
    //         );
    //     });
    // }
    /* Example of test filters:
    role: admin
    access: everything -> can acess all records where id is defined by the top

    role: coordinator
    access: everything part of same country ( based on creator )

    role: partner
    access: everything part of same country + same agency ( based on creator )

    */
    const form = await Form.findOne({ $or: [{ resource: id }, { form: id }] });

    const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));

    const permissionFilters = [];

    form.permissions.canQuery.forEach(x => {
        if ( !x.role || roles.some(role => role.equals(x.role))) {
            const filter = {};
            Object.assign(filter,
                x.access && convertFilter(x.access, Record, user)
            );
            permissionFilters.push(filter);
        }
    });

    return Record.find({ $and: [mongooseFilter, { $or: permissionFilters }] })
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage);
};