import { GraphQLError, GraphQLInt, GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";


export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    args : {
        page: { type: GraphQLInt },
        perPage: { type: GraphQLInt }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        if (args.page === 0 || args.page) {
            if (!args.perPage) { throw new GraphQLError(errors.invalidGetApplicationsArguments); }
            return Application.find({}).accessibleBy(ability).skip(args.page * args.perPage).limit(args.perPage);
        } else {
            return Application.find({}).accessibleBy(ability);
        }
    }
}
