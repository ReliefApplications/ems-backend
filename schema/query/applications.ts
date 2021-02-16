import { GraphQLList } from "graphql";
import { ApplicationType } from "../types";
import { Application } from "../../models";

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    resolve(parent, args, context) {
        const ability = context.user.ability;
        return Application.find({}).accessibleBy(ability);
    }
}