import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import protectedNames from "../../const/protectedNames";
import { Dashboard } from "../../models";
import checkPermission from "../../utils/checkPermission";
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
        if (protectedNames.indexOf(args.name.toLowerCase()) >= 0) {
            throw new GraphQLError(errors.usageOfProtectedName);
        }
        if (checkPermission(user, permissions.canManageApplications)) {
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