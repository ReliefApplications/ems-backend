import { GraphQLList, GraphQLBoolean, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { RoleType } from "../types";
import Role from '../../models/role';

export default {
    /*  List roles if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(RoleType),
    args: {
        all: { type: GraphQLBoolean },
        application: { type: GraphQLID }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeRoles)) {
            if (args.all) {
                return Role.find({});
            } else {
                if (args.application) {
                    return Role.find({ application: args.application });
                } else {
                    return Role.find({ application: null });
                }
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}