import { GraphQLList, GraphQLBoolean, GraphQLID, GraphQLError } from "graphql";
import { Role } from "../../models";
import { RoleType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";
import errors from "../../const/errors";

export default {
    /*  List roles if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(RoleType),
    args: {
        all: { type: GraphQLBoolean },
        application: { type: GraphQLID }
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (ability.can('read', 'Role')) {
            if (args.all) {
                return Role.accessibleBy(ability, 'read');
            } else {
                if (args.application) {
                    return Role.accessibleBy(ability, 'read').where({ application: args.application });
                } else {
                    return Role.accessibleBy(ability, 'read').where({ application: null });
                }
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}