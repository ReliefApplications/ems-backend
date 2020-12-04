import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Role } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { RoleType } from "../types";

export default {
    /*  Deletes a role.
        Throws an error if not logged or authorized.
    */
    type: RoleType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeRoles)) {
            return Role.findByIdAndDelete(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}