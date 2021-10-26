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
        // console.log('args.first');
        // console.log(args.first);
        // console.log('args.afterCursor');
        // console.log(args.afterCursor);
        // console.log('args.filters');
        // console.log(args.filters);
        // console.log(args.filters[0]);
        // console.log(args.filters[1]);
        // console.log(args.filters.toString());
        // console.log(args.filters.logic);
        // console.log(args.filters.filters);
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = context.user.ability;

        const abilityFilters = Application.accessibleBy(ability, 'read').getFilter();
        const queryFilters = buildFilters(args.filters);
        const filters: any[] = [queryFilters, abilityFilters];
        // console.log('queryFilters');
        // console.log(queryFilters);
        // console.log('abilityFilters');
        // console.log(abilityFilters);
        // console.log('filters');
        // console.log(filters);

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
                _id: {
                    $gt: decodeCursor(afterCursor),
                }
            } : {};

        const filtersQuery = {};
        // console.log('filtersQuery');
        // console.log(filtersQuery);
        // console.log('filterCustom');
        // console.log(args.filters);
        // console.log(args.filters.filters);
        // args.filters.filters.foreach((v, i, a) => {
        //     console.log(v);
        // })
        // args.filters.foreach((v, i, a) => {
        //     console.log(v);
        // });
        // for (let i = 0; i < args.filters.filters.length; i++) {
            // console.log(args.filters.filters[i]);
            // const f = args.filters.filters[i];
            // if(f.value !== ''){
                // // console.log(f);
                // const a = '{"$'+f.operator+'": {"'+f.field+'": "'+f.value+'"}}';
                // const aJ = JSON.parse(a);
                // console.log(a);
                // console.log(aJ);
                // const b = {};

                // const filterTemp = {};
                // filterTemp[f.field] = f.value;
                // filtersQuery['$'+f.operator] = filterTemp;

        const newFilters = (convertFilterToMongo(args.filters.filters));
        // filtersQuery['$and'] = [cursorFilters, ...filters, newFilters];
        filtersQuery['$'+args.filters.logic] = newFilters;
        console.log('newFilters');
        console.log(newFilters);

                // b[f.operator] =
                // filterCustom.add(
                //     // {`$${args.filters.filters[i].operator}`: { args.filters.filters[i].field: args.filters.filters[i].value }}
                //     // {'$+{'args.filters.filters[i].operator+'}': { args.filters.filters[i].field: args.filters.filters[i].value }}
                //     {'$'args.filters.filters[i].operator+':'+ args.filters.filters[i].field: args.filters.filters[i].value }}
                // );
            // }
        // }
        const temp = filtersQuery['$and'];
        const countDocumentFilter = {};
        console.log('GANG: filters');
        console.log(filters);
        console.log('temp');
        console.log(temp);
        if(temp) {
            filtersQuery['$and'] = [temp, cursorFilters, ...filters];
            countDocumentFilter['$and'] = [temp, ...filters];
        } else {
            filtersQuery['$and'] = [cursorFilters, ...filters];
            countDocumentFilter['$and'] = [...filters];
        }
        console.log('countDocumentFilter');
        console.log(countDocumentFilter);
        console.log('4: filtersQuery');
        console.log(filtersQuery);
        // console.log('cursorFilters');
        // console.log(cursorFilters);
        // console.log('filters');
        // console.log(filters);
        // const logic = '$'+args.filter.logic;

        // let items: any[] = await Application.find({ $and: [cursorFilters, ...filters] })
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
            console.log('***> f.value <***');
            console.log(f.value);
            switch (f.operator) {
                case 'contains':
                    filterTemp['$regex'] = f.value
                    newFilters[f.field] = filterTemp;
                    break;
                case 'is':
                    newFilters[f.field] = f.value;
                    break;
                case 'between':
                    console.log('f.value.sd');
                    console.log(f.value.startDate);
                    console.log('f.value.ed');
                    console.log(f.value.endDate);
                    // filterTemp['created_at'] = {
                    //     $gte: f.value.sd,
                    //     $lt: f.value.ed
                    // }
                    // newFilters[f.field] = filterTemp;
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
