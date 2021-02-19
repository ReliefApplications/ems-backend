import { GraphQLError, GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application } from "../../models";
import errors from "../../const/errors";

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    resolve(parent, args, context) {
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability = context.user.ability;
        return Application.find({}).accessibleBy(ability);
    }
}