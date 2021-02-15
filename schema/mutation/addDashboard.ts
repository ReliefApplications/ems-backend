import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Dashboard } from "../../models";
import { DashboardType } from "../types";

export default {
    /*  Creates a new dashboard.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: DashboardType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (user.ability.can('create', 'Dashboard')) {
            if (args.name !== '') {
                const dashboard = new Dashboard({
                    name: args.name,
                    createdAt: new Date(),
                });
                return dashboard.save();
            }
            throw new GraphQLError(errors.invalidAddDashboardArguments);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}