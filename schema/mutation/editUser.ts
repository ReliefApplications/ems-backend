import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Application, User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { UserType } from "../types";
import { PositionAttributeInputType } from "../inputs";
import { PositionAttribute} from "../../models";

export default {
    /*  Edits an user's roles, providing its id and the list of roles.
        Throws an error if not logged or authorized.
    */
    type: UserType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        application: { type: GraphQLID },
        positionAttributes: { type: new GraphQLList(PositionAttributeInputType) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        let roles = args.roles;
        if (args.application) {
            if (roles.length > 1) { throw new GraphQLError(errors.tooManyRoles); }
            const application = await Application.findById(args.application);
            if (!application || ability.cannot('update', application, 'users')) {
                throw new GraphQLError(errors.permissionNotGranted);
            }
            const nonAppRoles = await User.findById(args.id).populate({
                path: 'roles',
                match: { application: { $ne: args.application } } // Only returns roles not attached to the application
            });
            roles = nonAppRoles.roles.map(x => x._id).concat(roles);

            await User.findByIdAndUpdate(
                args.id,
                {
                    roles,
                },
                { new: true }
            ).populate({
                path: 'roles',
                match: { application: args.application } // Only returns roles attached to the application
            });

            let positionAttributesNew = args.positionAttributes.filter(element => element.value.length > 0);
            await User.findByIdAndUpdate(
                args.id,
                {
                    positionAttributes: positionAttributesNew,
                }
            )
            return await User.findById(args.id);
        } else {
            if (ability.cannot('update', 'User')) { throw new GraphQLError(errors.permissionNotGranted); }
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