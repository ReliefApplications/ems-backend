import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import { ApplicationConnectionType, encodeCursor, decodeCursor } from '../types';
import { Application } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';

const DEFAULT_FIRST = 10;

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: ApplicationConnectionType,
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        filters: { type: GraphQLJSON },
        // DEPREC disabled
        // sort: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = context.user.ability;

        const abilityFilters = Application.accessibleBy(ability, 'read').getFilter();
        // const queryFilters = buildFilters(args.filters);
        // const filters: any[] = [queryFilters, abilityFilters];

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
                _id: {
                    $gt: decodeCursor(afterCursor),
                }
            } : {};

        const filtersQuery = {};
        const newFilters = (convertFilterToMongo(args.filters.filters));
        filtersQuery['$'+args.filters.logic] = newFilters;

        const temp = filtersQuery['$and'];
        const countDocumentFilter = {};
        console.log('GANG: filters');
        console.log(abilityFilters);
        console.log('temp');
        console.log(temp);
        if(temp) {
            filtersQuery['$and'] = [temp, cursorFilters, abilityFilters];
            countDocumentFilter['$and'] = [temp, abilityFilters];
        } else {
            filtersQuery['$and'] = [cursorFilters, abilityFilters];
            countDocumentFilter['$and'] = [abilityFilters];
        }
        console.log('countDocumentFilter');
        console.log(countDocumentFilter);
        console.log('4: filtersQuery');
        console.log(filtersQuery);

        let items: any[] = await Application.find(filtersQuery)
            // DEPREC disabled
            // .sort(args.sort)
            .limit(first + 1);

        console.log('===> items.length <===');
        console.log('===>' + items.length + '<===');

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
            totalCount: await Application.countDocuments(filtersQuery)
        };
    }
}

const convertFilterToMongo = (filters: any): any => {
    console.log('filters');
    console.log(filters);
    const newFilters = {};
    const filterTemp = {};
    for (const f of filters) {
        if(f.value) {
            switch (f.operator) {
                case 'contains':
                    filterTemp['$regex'] = f.value
                    newFilters[f.field] = filterTemp;
                    break;
                case 'is':
                    newFilters[f.field] = f.value;
                    break;
                case 'between':
                    newFilters[f.field] = {
                        $gte: f.value.startDate,
                        $lte: f.value.endDate
                    };
                    break;
                default:
                    break;
            }
        }
    }
    return newFilters;
}

const buildFilters = (filters: any) => {
    if (filters) {
        const conditions = [];

        if (filters.name && filters.name.trim().length > 0) {
            conditions.push({ name: { $regex: new RegExp(filters.name, 'i') } });
        }
        if (filters.dateRange && filters.dateRange.start.trim().length > 0 && filters.dateRange.end.trim().length > 0) {
            conditions.push({
                createdAt: {
                    $gte: new Date(filters.dateRange.start),
                    $lte: new Date(filters.dateRange.end)
                }
            })
        }

        if (filters.status && filters.status.trim().length > 0) {
            conditions.push({ status: { $regex: filters.status } });
        }

        if (filters.ids && filters.ids.length > 0) {
            conditions.push({ _id: { $in: filters.ids.map(x => mongoose.Types.ObjectId(x)) } });
        }

        if (conditions.length > 0) {
            return {
                $and: conditions
            };
        }
    }
    return {};
}
