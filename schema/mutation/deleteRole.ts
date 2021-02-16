import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { Role } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { RoleType } from "../types";

export default {
    /*  Deletes a role.
        Throws an error if not logged or authorized.
    */
    type: RoleType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('delete', 'Role')) {
            return Role.findByIdAndDelete(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}