import { GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { User } from "../../models";
import { UserType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List back-office users if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(UserType),
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', 'User')) {
            return User.find({}).populate({
                path: 'roles',
                match: { application: { $eq: null } }
            });
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}