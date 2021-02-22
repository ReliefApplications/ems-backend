// import applyFilters from './applyFilters';

import { GraphQLError } from "graphql";
import errors from "../../../const/errors";
import { Form, Record, Resource } from "../../../models";
import { AppAbility } from "../../../security/defineAbilityFor";
import convertFilter from "../../convertFilter";
import getFilter from "./getFilter";
import getSortField from "./getSortField";

export default (id) => async (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {

    const user = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;

    const mongooseFilter = getFilter(filter);

    Object.assign(mongooseFilter,
        { $or: [{ resource: id}, { form: id }] }
    );

    const form = await Form.findById(id);

    if (!ability.can('read', 'Record')) {
        form.permissions.canQuery.forEach(x => {
            Object.assign(mongooseFilter,
                convertFilter(x.access, Record, user)
            );
        });
    }

    return Record.find(mongooseFilter)
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage);
};