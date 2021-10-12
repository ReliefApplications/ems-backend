import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Form, Record, User } from '../../../../models';
import getFilter from './getFilter';
import getSortField from './getSortField';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';
import { decodeCursor, encodeCursor } from '../../../../schema/types';

const DEFAULT_FIRST = 25;

export default (id, data) => async (
    _,
    {
        sortField,
        sortOrder = 'asc',
        first = DEFAULT_FIRST,
        skip = 0,
        afterCursor,
        filter = {}
    },
    context
) => {

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

    // PAGINATION
    const cursorFilters = afterCursor ? {
            _id: {
                $gt: decodeCursor(afterCursor),
            }
        } : {};

    let items: any[] = [];
    let filters: any = {};
    // Filter from the user permissions
    let permissionFilters = [];
    if (ability.cannot('read', 'Record')) {
        const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions');
        permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
        if (permissionFilters.length > 0) {
            filters = { $and: [mongooseFilter, { $or: permissionFilters }] };
        } else {
            // If permissions are set up and no one match our role return null
            if (form.permissions.canSeeRecords.length > 0) {
                return {
                    pageInfo: {
                        hasNextPage: false,
                        startCursor: null,
                        endCursor: null
                    },
                    edges: [],
                    totalCount: 0
                };
            } else {
                filters = mongooseFilter;
            }
        }
    } else {
        filters = mongooseFilter;
    }
    if (skip) {
        items = await Record.find(filters)
            .sort([[getSortField(sortField), sortOrder]])
            .skip(skip)
            .limit(first + 1);
    } else {
        items = await Record.find({ $and: [cursorFilters, filters]})
            .sort([[getSortField(sortField), sortOrder]])
            .limit(first + 1);
    }
    const hasNextPage = items.length > first;
    if (hasNextPage) {
        items = items.slice(0, items.length - 1);
    }
    const edges = items.map(r => ({
        cursor: encodeCursor(r.id.toString()),
        node: r,
    }));
    return {
        pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
        },
        edges,
        totalCount: await Record.countDocuments(filters)
    };
};
