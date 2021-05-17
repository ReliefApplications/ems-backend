import { GraphQLError, GraphQLInt, GraphQLList } from "graphql";
import { ResourceType } from "../types";
import { Resource } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import errors from "../../const/errors";
import GraphQLJSON from "graphql-type-json";

export default {
    /*  List all resources available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ResourceType),
    args: {
        page: {type: GraphQLInt},
        perPage: {type: GraphQLInt},
        filters: {type: GraphQLJSON},
        // TODO: sort by recordsCount is not implemented
        sort: {type: GraphQLJSON}
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;

        const filters = buildFilters(args.filters);

        if (args.page === 0 || args.page) {
            if (!args.perPage) {
                throw new GraphQLError(errors.invalidGetApplicationsArguments);
            }
            return Resource.find(filters).accessibleBy(ability).skip(args.page * args.perPage).limit(args.perPage).collation({ locale: 'en', strength: 1 }).sort(args.sort);
        } else {
            return Resource.find(filters).accessibleBy(ability).collation({ locale: 'en', strength: 1 }).sort(args.sort);
        }
    },
}

function buildFilters(filters) {
    if (filters) {
        const conditions = [];

        if (filters.name && filters.name.trim().length > 0) {
            conditions.push({name: {$regex: new RegExp(filters.name, 'i')}});
        }
        if (!!filters.dateRange && filters.dateRange.start.trim().length > 0 && filters.dateRange.end.trim().length > 0) {
            conditions.push({
                createdAt: {
                    $gte: new Date(filters.dateRange.start),
                    $lte: new Date(filters.dateRange.end)
                }
            })
        }

        if (conditions.length > 0) {
            return {
                $and: conditions
            };
        }
    }
    return {};
}
