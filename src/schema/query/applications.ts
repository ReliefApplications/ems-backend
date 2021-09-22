import { GraphQLError, GraphQLInt, GraphQLString } from 'graphql';
import { ApplicationType, encodeCursor, decodeCursor, Page } from '../types';
import { Application } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: Page(ApplicationType),
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLString },
        filters: { type: GraphQLJSON },
        sort: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = context.user.ability;

        const abilityFilters = Application.accessibleBy(ability, 'read').getFilter();
        const filters: any[] = [buildFilters(args.filters), abilityFilters]; 

        const { first, afterCursor } = args;
        if (args.afterCursor) {
            filters.unshift(
                {
                    _id: {
                        $gt: decodeCursor(afterCursor),
                    }
                }
            );
        }
        console.log(filters);

        let items: any[] = await Application.find({ $and: filters })
            .sort(args.sort)
            .limit(first + 1);

        const hasNextPage = items.length > first - 1;
        if (hasNextPage) {
            items= items.slice(0, items.length - 1);
        }
        const edges = items.map(r => ({
            cursor: encodeCursor(r.id.toString()),
            node: r,
        }));
        return {
            pageInfo: {
                hasNextPage,
            },
            edges,
            totalCount: await Application.countDocuments({ $and: filters })
        };
    }
}

const buildFilters = (filters: any) => {
    if (filters) {
        const conditions = [];

        if (filters.name && filters.name.trim().length > 0) {
            conditions.push({ name: { $regex: new RegExp(filters.name, 'i') } });
        }
        if (filters.dateRange.start.trim().length > 0 && filters.dateRange.end.trim().length > 0) {
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

        if (conditions.length > 0) {
            return {
                $and: conditions
            };
        }
    }
    return {};
}

