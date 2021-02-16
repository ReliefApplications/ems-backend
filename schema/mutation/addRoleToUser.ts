import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import mongoose from 'mongoose';
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Permission, Role, User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { UserType } from "../types";

export default {
    type: UserType,
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        role: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        const ability: AppAbility = context.user.ability;
        const role = await Role.findById(args.role);
        if (!role) throw new GraphQLError(errors.dataNotFound);
        // Check permissions depending if it's an application's user or a global user
        if (ability.cannot('update', 'User')){
            if (role.application) {
                const neededPermission = await Permission.findOne({ type: permissions.canSeeRoles, global: false });
                const userRoles = await Role.find({_id: user.roles.map(x => mongoose.Types.ObjectId(x._id))});
                if (!userRoles.some(x => x.application && x.application.equals(role.application) && x.permissions.some(y => y.equals(neededPermission._id)))) {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
        // Perform the add role to user
        let invitedUser = await User.findOne({'username': args.username });
        if (invitedUser) {
            invitedUser = await User.findOneAndUpdate(
                {'username': args.username },
                {
                    $push: { roles: args.role },
                },
                { new: true }
            ).populate({
                path: 'roles',
                match: { application: { $eq: role.application } }
            });
            return invitedUser;
        } else {
            invitedUser = new User();
            invitedUser.username = args.username;
            invitedUser.roles = [args.role];
            await invitedUser.save();
            return invitedUser;
        }
    }
}