import { GraphQLError, GraphQLInt, GraphQLList } from "graphql";
import { FormType } from "../types";
import { Application, Form } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";
import GraphQLJSON from "graphql-type-json";

export default {
    /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(FormType),
    args: {
        page: {type: GraphQLInt},
        perPage: {type: GraphQLInt},
        filters: {type: GraphQLJSON},
        sort: {type: GraphQLJSON}
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }

        const ability: AppAbility = context.user.ability;


        const filters = buildFilters(args.filters);

        if (args.page === 0 || args.page) {
            if (!args.perPage) {
                throw new GraphQLError(errors.invalidGetApplicationsArguments);
            }
            return Form.find(filters).accessibleBy(ability).skip(args.page * args.perPage).limit(args.perPage).collation({ locale: 'en', strength: 1 }).sort(args.sort);
        } else {
            return Form.find(filters).accessibleBy(ability).collation({ locale: 'en', strength: 1 }).sort(args.sort);
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

        if (filters.status && filters.status.trim().length > 0) {
            conditions.push({status: {$regex: filters.status}});
        }

        if (filters.core) {
            if (filters.core === 'false') {
                conditions.push({core: {$exists: false}});
            } else {
                conditions.push({core: filters.core});
            }
        }

        if (conditions.length > 0) {
            return {
                $and: conditions
            };
        }
    }
    return {};
}

