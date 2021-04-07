import { GraphQLNonNull, GraphQLError, GraphQLString, GraphQLList, GraphQLID } from "graphql";
import errors from "../../const/errors";
import { FormType } from "../types";
import { Form } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Returns forms which have at least one question which is linked to the passed resource.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(FormType),
    args: {
        resource: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        return Form.find({ status: 'active', 'fields.resource': args.resource }).accessibleBy(ability, 'read');
    },
}