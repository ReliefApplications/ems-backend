import { GraphQLList, GraphQLBoolean, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Role } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { RoleType } from "../types";

export default {
    /*  List roles if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(RoleType),
    args: {
        all: { type: GraphQLBoolean },
        application: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeRoles)) {
            if (args.all) {
                return await Role.find({});
            } else {
                if (args.application) {
                    return await Role.find({ application: args.application });
                } else {
                    return await Role.find({ application: null });
                }
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}