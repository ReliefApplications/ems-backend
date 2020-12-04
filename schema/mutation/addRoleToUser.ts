import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { User } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { UserType } from "../types";

export default {
    type: UserType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        role: { type: new GraphQLNonNull(GraphQLID) }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeUsers)) {
            return User.findByIdAndUpdate(
                args.id,
                {
                    $push: { roles: args.role },
                },
                { new: true }
            );
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}