import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Role, User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { UserType } from "../types";

export default {
    type: UserType,
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        role: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('update', 'User')) {
            const role = await Role.findById(args.role);
            if (!role) throw new GraphQLError(errors.dataNotFound);
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
                });;
                return invitedUser;
            } else {
                invitedUser = new User();
                invitedUser.username = args.username;
                invitedUser.roles = [args.role];
                await invitedUser.save();
                return invitedUser;
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}