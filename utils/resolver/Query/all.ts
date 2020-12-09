// import applyFilters from './applyFilters';

import { Record } from "../../../models";
import getFilter from "./getFilter";

const getSortField = (sortField) => {
    const topFields = ['id', 'createdAt'];
    if (sortField && !topFields.includes(sortField)) {
        return `data.${sortField}`;
    }
    return sortField;
}

export default (id) => (
    _,
    { sortField, sortOrder = 'asc', page = 0, perPage = 25, filter = {} }
) => {

    const mongooseFilter = getFilter(filter);

    Object.assign(mongooseFilter,
        { $or: [{ resource: id}, { form: id }] }
    );

    return Record.find(mongooseFilter)
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage)

    // TODO: check filters
    // items = applyFilters(items, filter);
};