import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Role } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { RoleType } from "../types";

export default {
    /*  Edits a role's admin permissions, providing its id and the list of admin permissions.
        Throws an error if not logged or authorized.
    */
    type: RoleType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        permissions: { type: new GraphQLList(GraphQLID) },
        notifications: { type: new GraphQLList(GraphQLString) }
    },
    resolve(parent, args, context) {
        if (!args || (!args.permissions && !args.notifications)) throw new GraphQLError(errors.invalidEditRolesArguments);
        const user = context.user;
        if (checkPermission(user, permissions.canSeeRoles)) {
            const update = {
            };
            Object.assign(update,
                args.permissions && { permissions: args.permissions },
                args.notifications && { notifications: args.notifications }
            );
            return Role.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}