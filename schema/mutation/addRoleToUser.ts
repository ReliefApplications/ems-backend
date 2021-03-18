import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString, GraphQLList } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Role, User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { PositionAttributeInputType } from "../inputs";
import { UserType } from "../types";

export default {
    type: UserType,
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        role: { type: new GraphQLNonNull(GraphQLID) },
        positionAttributes: { type: new GraphQLList(PositionAttributeInputType)}
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const role = await Role.findById(args.role).populate('application');
        if (!role) throw new GraphQLError(errors.dataNotFound);
        // Check permissions depending if it's an application's user or a global user
        if (ability.cannot('update', 'User')) {
            if (role.application) {
                const canUpdate = user.roles.filter(x => x.application ? x.application.equals(role.application) : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                if (!canUpdate) {
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
                    $push: {
                        roles: args.role,
                        positionAttributes: args.positionAttributes
                    },
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
            if (args.positionAttributes) { invitedUser.positionAttributes = args.positionAttributes; }
            await invitedUser.save();
            return invitedUser;
        }
    }
}