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
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const filters = Role.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const role = await Role.findOneAndDelete(filters);
        if (role) {
            return role;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}