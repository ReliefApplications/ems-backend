// import applyFilters from './applyFilters';

import { GraphQLError } from "graphql";
import errors from "../../../const/errors";
import { Record } from "../../../models";
import getFilter from "./getFilter";
import getSortField from "./getSortField";

export default (id) => (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} },
    context
) => {

    const user = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }

    const mongooseFilter = getFilter(filter);

    Object.assign(mongooseFilter,
        { $or: [{ resource: id}, { form: id }] }
    );

    return Record.find(mongooseFilter)
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage);
};