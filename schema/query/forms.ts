import { GraphQLList } from "graphql";
import { FormType } from "../types";
import { Form } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(FormType),
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.find({}).accessibleBy(ability);
    },
}