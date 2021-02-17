import { GraphQLList, GraphQLBoolean, GraphQLID } from "graphql";
import { Role } from "../../models";
import { RoleType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

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
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', 'Role')) {
            if (args.all) {
                return Role.find({});
            } else {
                if (args.application) {
                    return Role.find({ application: args.application });
                } else {
                    return Role.find({ application: null });
                }
            }
        } 
    }
}