// import applyFilters from './applyFilters';

import { GraphQLError } from "graphql";
import errors from "../../../const/errors";
import { Form, Record, User } from "../../../models";
import getFilter from "./getFilter";
import getSortField from "./getSortField";
import getPermissionFilters from "../../getPermissionFilters";
import { AppAbility } from "../../../security/defineAbilityFor";

export default (id) => async (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {

    const user: User = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;

    // Filter from the query definition
    const mongooseFilter = getFilter(filter);
    Object.assign(mongooseFilter,
        { $or: [{ resource: id }, { form: id }] }
    );

    // Filter from the user permissions
    let permissionFilters = [];
    if (ability.cannot('read', 'Record')) {
        const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] });
        permissionFilters = getPermissionFilters(user, form, 'canSeeRecords');
        if (permissionFilters.length) {
            return Record
                .aggregate([
                    {
                        $match: {
                            $and: [mongooseFilter, { $or: permissionFilters }]
                        }
                    },
                    {
                        $addFields: {
                            id: "$_id"
                        }
                    },
                    {
                        $skip: page * perPage
                    },
                    {
                        $limit: perPage
                    }
                ]);
        } else {
            return null;
        }
    } else {
        return Record
            .aggregate([
                {
                    $match: mongooseFilter
                },
                {
                    $addFields: {
                        id: "$_id"
                    }
                },
                {
                    $sort: { [getSortField(sortField)]: (sortOrder === 'asc') ? 1 : -1 }
                },
                {
                    $skip: page * perPage
                },
                {
                    $limit: perPage
                }
            ]);
        // return Record
        //     .find(mongooseFilter)
        //     .sort([[getSortField(sortField), sortOrder]])
        //     .skip(page * perPage)
        //     .limit(perPage);
    }
};