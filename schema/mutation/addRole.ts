import { GraphQLNonNull, GraphQLString, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Role, Application } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { RoleType } from "../types";

export default {
    /*  Creates a new role.
        Throws an error if not logged or authorized.
    */
    type: RoleType,
    args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        application: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (args.application) {
            const application = await Application.findById(args.application);
            if (!application) throw new GraphQLError(errors.dataNotFound);
            if (ability.can('create', application, 'roles')) {
                const role = new Role({
                    title: args.title
                });
                if (!application) throw new GraphQLError(errors.dataNotFound);
                role.application = args.application;
                return role.save();
            }
        } else if (ability.can('create', 'Role')) {
            const role = new Role({
                title: args.title
            });
            return role.save();
        }
        throw new GraphQLError(errors.permissionNotGranted);
    },
}