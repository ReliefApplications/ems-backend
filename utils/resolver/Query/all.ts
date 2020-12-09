// import applyFilters from './applyFilters';

import { Record } from "../../../models";

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

    return Record.find({ resource: id })
        .sort([[getSortField(sortField), sortOrder]])
        .skip(page * perPage)
        .limit(perPage)

    // if (sortField) {
    //     const direction = sortOrder.toLowerCase() == 'asc' ? 1 : -1;
    //     items = items.sort((a, b) => {
    //         if (a[sortField] > b[sortField]) {
    //             return direction;
    //         }
    //         if (a[sortField] < b[sortField]) {
    //             return -1 * direction;
    //         }
    //         return 0;
    //     });
    // }

    // TODO: check filters
    // items = applyFilters(items, filter);

    // if (page !== undefined && perPage) {
    //     items = items.slice(page * perPage, page * perPage + perPage);
    // }

    // return items;
};