import { GraphQLError, GraphQLList } from "graphql";
import { BasicFormType } from "../types";
import { Form } from "../../models";
import errors from "../../const/errors";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(BasicFormType),
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        return Form.accessibleBy(ability, 'read');
    },
}
