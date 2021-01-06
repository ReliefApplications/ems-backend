import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { User } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { UserType } from "../types";

export default {
    type: UserType,
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        role: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeUsers)) {
            let invitedUser = await User.findOne({'username': args.username });
            if (invitedUser) {
                invitedUser = await User.findOneAndUpdate(
                    {'username': args.username },
                    {
                        $push: { roles: args.role },
                    },
                    { new: true }
                );
                return invitedUser;
            } else {
                invitedUser = new User();
                invitedUser.username = args.username;
                invitedUser.roles = [args.role];
                await invitedUser.save();
                console.log(invitedUser);
                return invitedUser;
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}