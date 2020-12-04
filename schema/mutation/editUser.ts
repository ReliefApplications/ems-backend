import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { UserType } from "../types";
import User from '../../models/user';

export default {
    /*  Edits an user's roles, providing its id and the list of roles.
        Throws an error if not logged or authorized.
    */
    type: UserType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        application: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let roles = args.roles;
        if (checkPermission(user, permissions.canSeeUsers)) {
            if (args.application) {
                if (roles.length > 1) throw new GraphQLError(errors.tooManyRoles);
                const userRoles = await User.findById(args.id).populate({
                    path: 'roles',
                    match: { application: { $ne: args.application } } // Only returns roles not attached to the application
                });
                roles = userRoles.roles.map(x => x._id).concat(roles);
                return User.findByIdAndUpdate(
                    args.id,
                    {
                        roles,
                    },
                    { new: true }
                ).populate({
                    path: 'roles',
                    match: { application: args.application } // Only returns roles attached to the application
                });
            } else {
                const appRoles = await User.findById(args.id).populate({
                    path: 'roles',
                    match: { application: { $ne: null } } // Returns roles attached to any application
                });
                roles = appRoles.roles.map(x => x._id).concat(roles);
                return User.findByIdAndUpdate(
                    args.id,
                    {
                        roles,
                    },
                    { new: true }
                );
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}