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
        const ability: AppAbility = context.user.ability;
        if (args.application) {
            // Check if other roles of the same application have the create permission, it means the user can add an new one
            const permissionRole = await Role.accessibleBy(ability, 'create').where({application: args.application});
            if (permissionRole) {
                const role = new Role({
                    title: args.title
                });
                const application = await Application.findById(args.application);
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