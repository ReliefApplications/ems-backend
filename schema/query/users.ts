import { GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { User } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { UserType } from "../types";

export default {
    /*  List back-office users if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(UserType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeUsers)) {
            return User.find({}).populate({
                path: 'roles',
                match: { application: { $eq: null } }
            });
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}