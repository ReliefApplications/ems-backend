import { GraphQLList } from "graphql";
import { PageType } from "../types";
import { Page } from '../../models';
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all pages available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(PageType),
    resolve(parent, args, context) {
        console.log("here")
        const ability: AppAbility = context.user.ability;
        return Page.find({}).accessibleBy(ability);
    }
}