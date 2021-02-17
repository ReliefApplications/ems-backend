import { GraphQLList } from "graphql";
import { ResourceType } from "../types";
import { Resource } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all resources available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ResourceType),
    resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Resource.find({}).accessibleBy(ability);
    },
}
