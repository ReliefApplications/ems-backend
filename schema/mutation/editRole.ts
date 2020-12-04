import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
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
        permissions: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeRoles)) {
            return Role.findByIdAndUpdate(
                args.id,
                {
                    permissions: args.permissions
                },
                { new: true }
            );
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}