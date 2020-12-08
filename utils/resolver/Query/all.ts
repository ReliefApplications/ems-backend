// import applyFilters from './applyFilters';

import { Record } from "../../../models";

export default (id) => (
    _,
    { sortField, sortOrder = 'asc', page, perPage = 25, filter = {} }
) => {

    return Record.find({ resource: id })

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