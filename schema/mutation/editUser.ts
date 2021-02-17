import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { UserType } from "../types";

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
        const ability: AppAbility = context.user.ability;
        let roles = args.roles;
        if (args.application) {
            if (roles.length > 1) throw new GraphQLError(errors.tooManyRoles);
            if (ability.cannot('update', 'User')) {
                const canUpdate = context.user.roles.filter(x => x.application ? x.application.equals(args.application) : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                if (!canUpdate) {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            }
            const nonAppRoles = await User.findById(args.id).populate({
                path: 'roles',
                match: { application: { $ne: args.application } } // Only returns roles not attached to the application
            });
            roles = nonAppRoles.roles.map(x => x._id).concat(roles);
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
            if (ability.cannot('update', 'User')) throw new GraphQLError(errors.permissionNotGranted);
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
    },
}